import { Conversation, type Pair } from "@models";
import {
  TypingObserver,
  TypingObserverEvent,
  type TypingObserverOptions,
  type BaseTypingEvent,
} from "@interactions/typingObserver";
import { AIChatSocket } from "@sockets/AIChatSockets";
import type { ChatID, UserID } from "@/sockets/ChatEvents";
import {
  Emitter,
  type SDKEvents,
  type Unsub,
  type StatusMapper,
  type ModeratorConfig,
} from "@sdk/types";

export interface ChatSDKOptions {
  socket: AIChatSocket;
  chatId: ChatID;
  userId: UserID;
  mapStatus?: StatusMapper;
  typing?: { target: HTMLElement | string; options?: TypingObserverOptions; autoEmit?: boolean };
  moderator?: ModeratorConfig;
}

const defaultMapStatus: StatusMapper = (s: any) => {
  const v = String(s ?? "").toLowerCase();
  if (v === "queued") return "queued";
  if (v === "working" || v === "retrying" || v === "running") return "running";
  if (v === "done") return "done";
  if (v === "error" || v === "failed") return "error";
  return "running";
};

export class ChatSDK {
  private readonly socket: AIChatSocket;
  private readonly chatId: ChatID;
  private readonly userId: UserID;
  private readonly mapStatus: StatusMapper;
  private readonly emitter = new Emitter();
  private typing?: TypingObserver;
  private unsubs: Unsub[] = [];

  /** Public graph state for renderers/store. */
  readonly conversation = new Conversation();

  constructor(opts: ChatSDKOptions) {
    this.socket = opts.socket;
    this.chatId = opts.chatId;
    this.userId = opts.userId;
    this.mapStatus = opts.mapStatus ?? defaultMapStatus;

    this.bindSocketCallbacks();
    if (opts.typing) this.initTyping(opts.typing);
  }

  /* ------------- Events API ------------- */
  on<K extends keyof SDKEvents>(e: K, fn: (p: SDKEvents[K]) => void) {
    return this.emitter.on(e, fn);
  }
  off<K extends keyof SDKEvents>(e: K, fn: (p: SDKEvents[K]) => void) {
    this.emitter.off(e, fn);
  }

  /* ------------- Lifecycle ------------- */
  connect() { this.socket.connect(); }
  disconnect() { this.clear(); this.socket.disconnect(); }
  dispose() { this.clear(); this.emitter.clear(); this.typing?.destroy(); }

  /* ------------- Client actions ------------- */
  async sendText(
    text: string,
    extra?: {
      parts?: Array<{ type: "text" | "image" | "file"; value: unknown }>;
      traceId?: string;
      requestId?: string;
    }
  ) {
    // 1) moderate
    const moderated = await this.runModeration(text);
    if (moderated.action === "block") {
      this.emitter.emit("error", { error: { code: "blocked", reason: moderated.reason } });
      return null;
    }
    const finalText = moderated.text;

    // 2) optimistic graph update
    const pair = this.conversation.user(finalText);
    this.conversation.beginAssistantWork(pair, { source: "client" });
    this.emitUpdate(pair);

    // 3) emit via your socket (always include requestId)
    this.socket.sendMessage({
      messageId: pair.user.id,
      userId: this.userId,
      text: finalText,
      parts: extra?.parts,
      traceId: extra?.traceId,
      requestId: extra?.requestId ?? pair.path.id, // ✅ critical: default to path.id
    });

    // 4) notify consumers
    this.emitter.emit("pair:created", { pair });
    return pair;
  }

  abort(reason?: string) { this.socket.abort(reason); }

  markRead(messageIds: string[], readAt = new Date().toISOString()) {
    this.socket.markRead({ userId: this.userId, messageIds, readAt });
  }

  /* ------------- Internals ------------- */
  private bindSocketCallbacks() {
    this.socket.setCallbacks({
      onAIProcessing: (e) => {
        const pair = this.conversation.lastPair(); if (!pair) return;
        const prev = pair.path.process.status as any;
        const to = this.mapStatus(e.status);
        if (to === "queued") pair.path.start();
        else if (to === "running") pair.path.running();
        else if (to === "done") pair.path.done();
        else if (to === "error") pair.path.error({ reason: e.reason });
        pair.path.step("server:processing", { ...e }).endStep(true);
        this.emitter.emit("status:change", { pathId: pair.path.id, from: prev, to, meta: e });
        this.emitUpdate(pair);
      },
      onAIToken: (e) => {
        const pair = this.conversation.lastPair(); if (!pair) return;
        pair.path.running();
        const prev = pair.system.content?.message ?? "";
        const next = prev + (e.token ?? "");
        pair.system.setContent(next, pair.system.content?.options);
        this.emitter.emit("ai:token", { token: e.token, index: e.index, cumulative: next });
        this.emitter.emit("system:update", {
          nodeId: pair.system.id,
          message: next,
          options: pair.system.content?.options,
          timestamp: pair.system.content?.timestamp,
        });
        this.emitUpdate(pair);
      },
      onAIMessage: (e) => {
        const pair = this.conversation.lastPair(); if (!pair) return;
        pair.path.endStep(true, { usage: e.usage });
        const options: string[] | undefined = (e as any).options;
        if (options) pair.system.setContent(e.text, options); else pair.system.setContent(e.text);
        if (pair.system.content && e.createdAt) pair.system.content.timestamp = Date.parse(e.createdAt);
        this.conversation.resolveAssistant(pair, e.text, { usage: e.usage });
        this.emitter.emit("ai:message", { text: e.text, usage: e.usage });
        this.emitter.emit("system:update", {
          nodeId: pair.system.id,
          message: e.text,
          options: pair.system.content?.options,
          timestamp: pair.system.content?.timestamp,
        });
        this.emitUpdate(pair);
      },
      onAIError: (e) => {
        const pair = this.conversation.lastPair();
        if (pair) this.conversation.failAssistant(pair, e);
        this.emitter.emit("error", { error: e });
        this.emitUpdate(pair);
      },
      onChatMessage: (e) => {
        const sys = this.conversation.system(e.text);
        if (sys.content && e.createdAt) sys.content.timestamp = Date.parse(e.createdAt);
        this.emitter.emit("chat:message", { text: sys.content?.message ?? "", createdAt: sys.content?.timestamp, raw: e });
        this.emitUpdate();
      },
      onPresenceUpdate: (e) => {
        this.emitter.emit("presence:update", { onlineUserIds: e.onlineUserIds });
      },
      onServerError: (err) => { this.emitter.emit("error", { error: err }); },
      onConnect: () => this.emitter.emit("connected", { chatId: this.chatId }),
      onDisconnect: () => this.emitter.emit("disconnected", { chatId: this.chatId }),
    });
  }

  private initTyping(cfg: { target: HTMLElement | string; options?: TypingObserverOptions; autoEmit?: boolean }) {
    const { target, options, autoEmit = true } = cfg;
    this.typing = new TypingObserver(target, options);

    const relay =
      (kind: "start" | "pause" | "stop" | "tick") =>
      (snapshot: BaseTypingEvent) =>
        this.emitter.emit("typing", { kind, snapshot });

    this.unsubs.push(
      this.typing.on(TypingObserverEvent.TypingStart, (s) => { relay("start")(s); if (autoEmit) this.socket.typingStart(this.userId); }),
      this.typing.on(TypingObserverEvent.TypingPause, relay("pause")),
      this.typing.on(TypingObserverEvent.Typing, relay("tick")),
      this.typing.on(TypingObserverEvent.TypingStop, (s) => { relay("stop")(s); if (autoEmit) this.socket.typingStop(this.userId); }),
      this.typing.on(TypingObserverEvent.Focus, relay("tick")),
      this.typing.on(TypingObserverEvent.Blur, relay("stop")),
    );
  }

  private clear() {
    this.unsubs.splice(0).forEach((u) => { try { u(); } catch { /* noop */ } });
  }

  private emitUpdate(changed?: Pair) {
    queueMicrotask(() => this.emitter.emit("conversation:update", { conversation: this.conversation, changed }));
  }

  private async runModeration(text: string) {
    const cfg = (this as any).opts?.moderator as ModeratorConfig | undefined;
    const pipe = cfg?.pipeline;
    if (!pipe?.length) return { action: "allow", text } as const;

    let current = text;
    for (const step of pipe) {
      const res = await step(current);
      cfg?.onDecision?.(res);
      if (res.action === "block") return res;
      if (res.action === "modify") current = res.text;
    }
    return { action: "allow", text: current } as const;
  }
}
