/* eslint-disable no-console */
import { AIChatSocket } from  "@sockets/AIChatSockets";
import type { ChatID, UserID } from "@/sockets/ChatEvents";
import { Conversation } from "@models";
import { TypingObserver, TypingObserverEvent } from "@interactions/typingObserver"

// ---------- Types used by this example ----------
type SDKStatus = "queued" | "running" | "done" | "error";
type StatusMapper = (serverStatus: any) => SDKStatus;

type PromptPart =
  | { kind: "system"; text: string }
  | { kind: "guard";  text: string }
  | { kind: "user";   text: string };

type Decision =
  | { action: "allow";  text: string }
  | { action: "modify"; text: string; reason?: string }
  | { action: "block";  text: string; reason?: string };

type Msg = { message: string; options?: string[]; timestamp?: number };
type Row = { user?: Msg; system?: Msg; status?: "queued"|"running"|"done"|"error" };

// ---------- Simple UI event bus (optional) ----------
type UIEvents =
  | { type: "conversation:update" }
  | { type: "status:change"; pathId: string; from: SDKStatus; to: SDKStatus; meta?: any }
  | { type: "ai:token"; token: string; index: number; cumulative: string }
  | { type: "ai:message"; text: string }
  | { type: "system:update"; message: string; options?: string[] }
  | { type: "typing"; kind: "start" | "pause" | "stop" | "tick" }
  | { type: "error"; error: unknown };

function makeEmitter() {
  const handlers = new Set<(evt: UIEvents) => void>();
  return {
    on(fn: (evt: UIEvents) => void) { handlers.add(fn); return () => handlers.delete(fn); },
    emit(evt: UIEvents) { for (const fn of [...handlers]) fn(evt); }
  };
}

// ---------- Prompt composer & moderator ----------
function composePrompt(parts: PromptPart[]) {
  const system = parts.filter(p => p.kind === "system").map(p => p.text).join("\n");
  const guards = parts.filter(p => p.kind === "guard").map(p => p.text).join("\n");
  const user   = parts.find(p => p.kind === "user")?.text ?? "";

  const composed = [system, guards, user].filter(Boolean).join("\n\n");

  // Pass structure to server if you want it to see context explicitly
  const structuredParts = [
    system && { type: "text", value: { role: "system", text: system } },
    guards && { type: "text", value: { role: "guard",  text: guards } },
  ].filter(Boolean) as Array<{ type: "text"; value: { role: string; text: string } }>;

  return { composed, structuredParts };
}

// simple, synchronous moderation pipeline (replace with your own logic/services)
const moderationPipeline = [
  (t: string): Decision => t.length > 4000 ? ({ action: "block", text: t, reason: "too_long" })
                                           : ({ action: "allow", text: t }),
  (t: string): Decision => /forbidden/i.test(t) ? ({ action: "modify", text: t.replace(/forbidden/ig, "******") })
                                                : ({ action: "allow", text: t }),
];
async function moderate(text: string): Promise<Decision> {
  let cur = text;
  for (const step of moderationPipeline) {
    const res = await Promise.resolve(step(cur));
    if (res.action === "block") return res;
    if (res.action === "modify") cur = res.text;
  }
  return { action: "allow", text: cur };
}

// ---------- Rebuild helper (from a persisted shape) ----------
function rebuildConversationFromShape(rows: Row[]): Conversation {
  const convo = new Conversation();
  rows.forEach((row, i) => {
    const hasU = !!row.user?.message; const hasS = !!row.system?.message;

    if (hasU && hasS) {
      const p = convo.user(row.user!.message, row.user!.options);
      if (p.user.content && row.user!.timestamp) p.user.content.timestamp = row.user!.timestamp;
      p.system.setContent(row.system!.message, row.system!.options);
      if (p.system.content && row.system!.timestamp) p.system.content.timestamp = row.system!.timestamp;
      p.path.process.startedAt = row.user!.timestamp ?? Date.now();
      p.path.process.endedAt = row.system!.timestamp ?? p.path.process.startedAt;
      p.path.process.status = "done";
      p.path.process.steps.push({
        name: "rebuild", startedAt: p.path.process.startedAt!, endedAt: p.path.process.endedAt!, ok: true, info: { i }
      });
      return;
    }

    if (hasU) {
      const p = convo.user(row.user!.message, row.user!.options);
      if (p.user.content && row.user!.timestamp) p.user.content.timestamp = row.user!.timestamp;
      const st = row.status ?? "queued";
      if (st === "queued")  p.path.start();
      if (st === "running") p.path.running();
      if (st === "done")    p.path.done();
      if (st === "error")   p.path.error();
      p.path.process.startedAt ??= row.user!.timestamp ?? Date.now();
      p.path.process.steps.push({ name: "rebuild", startedAt: p.path.process.startedAt, info: { i, status: st } });
      return;
    }

    if (hasS) {
      const s = convo.system(row.system!.message);
      if (s.content && row.system!.timestamp) s.content.timestamp = row.system!.timestamp;
      const lastPath = convo.paths[convo.paths.length - 1];
      if (lastPath) {
        lastPath.process.endedAt = row.system!.timestamp ?? Date.now();
        lastPath.process.status  = "done";
        lastPath.process.steps.push({
          name: "rebuild", startedAt: lastPath.process.endedAt!, endedAt: lastPath.process.endedAt!, ok: true, info: { i }
        });
      }
    }
  });
  return convo;
}

// ---------- Example App (uses all components) ----------
export function initChatDemo(opts: {
  socketUrl: string;
  chatId: ChatID;
  userId: UserID;
  inputSelector: string;                    // e.g. "#message"
  statusMapper?: StatusMapper;              // map server statuses → UI statuses
  onUIEvent?: (evt: UIEvents) => void;      // observe everything from this demo
  hydrate?: Row[];                          // optional persisted rows to rebuild from
}) {
  const mapStatus: StatusMapper = opts.statusMapper ?? ((s) => {
    const v = String(s ?? "").toLowerCase();
    if (v === "queued") return "queued";
    if (v === "working" || v === "retrying" || v === "running") return "running";
    if (v === "done")    return "done";
    if (v === "error" || v === "failed") return "error";
    return "running";
  });

  const ui = makeEmitter();
  if (opts.onUIEvent) ui.on(opts.onUIEvent);

  // 1) Graph state
  let convo = new Conversation();
  if (opts.hydrate?.length) {
    convo = rebuildConversationFromShape(opts.hydrate);
    ui.emit({ type: "conversation:update" });
  }

  // 2) Track active pairs by requestId for perfect server correlation
  const byRequestId = new Map<string, ReturnType<Conversation["user"]>>();
  let lastPair: ReturnType<Conversation["user"]> | null = null;

  // 3) Socket client (your implementation)
  const chat = new AIChatSocket({
    url: opts.socketUrl,
    chatId: opts.chatId,
    autoConnect: true,
    callbacks: {
      onConnect:     () => ui.emit({ type: "conversation:update" }),
      onDisconnect:  () => ui.emit({ type: "conversation:update" }),

      onChatMessage: (e) => {
        const sys = convo.system(e.text);
        if (sys.content && e.createdAt) sys.content.timestamp = Date.parse(e.createdAt);
        ui.emit({ type: "system:update", message: sys.content?.message ?? ''});
        ui.emit({ type: "conversation:update" });
      },

      onAIProcessing: (e) => {
        const pair = (e.requestId && byRequestId.get(e.requestId)) || lastPair;
        if (!pair) return;
        const prev = (pair.path.process.status as SDKStatus) || "queued";
        const to   = mapStatus(e.status);

        if (to === "queued")  pair.path.start();
        if (to === "running") pair.path.running();
        if (to === "done")    pair.path.done();
        if (to === "error")   pair.path.error({ reason: e.reason });

        pair.path.step("server:processing", { ...e }).endStep(true);

        ui.emit({ type: "status:change", pathId: pair.path.id, from: prev, to, meta: e });
        ui.emit({ type: "conversation:update" });
      },

      onAIToken: (e) => {
        const pair = (e.requestId && byRequestId.get(e.requestId)) || lastPair;
        if (!pair) return;
        pair.path.running();
        const prev = pair.system.content?.message ?? "";
        const next = prev + (e.token ?? "");
        pair.system.setContent(next, pair.system.content?.options);

        ui.emit({ type: "ai:token", token: e.token, index: e.index, cumulative: next });
        ui.emit({ type: "system:update", message: next, options: pair.system.content?.options });
        ui.emit({ type: "conversation:update" });
      },

      onAIMessage: (e) => {
        const pair = (e.requestId && byRequestId.get(e.requestId)) || lastPair;
        if (!pair) return;

        pair.path.endStep(true, { usage: e.usage });

        // If your server returns `options`, include them:
        const options = (e as any).options as string[] | undefined;
        if (options) pair.system.setContent(e.text, options);
        else         pair.system.setContent(e.text);

        if (pair.system.content && e.createdAt) {
          pair.system.content.timestamp = Date.parse(e.createdAt);
        }

        convo.resolveAssistant(pair, e.text, { usage: e.usage });

        ui.emit({ type: "ai:message", text: e.text });
        ui.emit({ type: "system:update", message: e.text, options: pair.system.content?.options });
        ui.emit({ type: "conversation:update" });

        if (e.requestId) byRequestId.delete(e.requestId);
      },

      onAIError: (e) => {
        const pair = lastPair;
        if (pair) convo.failAssistant(pair, e);
        ui.emit({ type: "error", error: e });
        ui.emit({ type: "conversation:update" });
      },

      onPresenceUpdate: (e) => {
        console.log("presence:update", e.onlineUserIds);
      },
    },
  });

  // 4) Typing observer (frontend-only UX). Also notify server on start/stop.
  const typing = new TypingObserver(opts.inputSelector, { pauseDelay: 700, stopDelay: 1500 });
  typing.on(TypingObserverEvent.TypingStart, () => ui.emit({ type: "typing", kind: "start" }));
  typing.on(TypingObserverEvent.Typing,      () => ui.emit({ type: "typing", kind: "tick"  }));
  typing.on(TypingObserverEvent.TypingPause, () => ui.emit({ type: "typing", kind: "pause" }));
  typing.on(TypingObserverEvent.TypingStop,  () => ui.emit({ type: "typing", kind: "stop"  }));
  typing.on(TypingObserverEvent.TypingStart, () => chat.typingStart(opts.userId));
  typing.on(TypingObserverEvent.TypingStop,  () => chat.typingStop(opts.userId));

  // 5) Public helpers your UI can call
  async function send(text: string) {
    // Compose prompts (system/guard/user) – put YOUR templates here:
    const { composed, structuredParts } = composePrompt([
      { kind: "system", text: "You are a helpful assistant." },
      { kind: "guard",  text: "Avoid PII." },
      { kind: "user",   text },
    ]);

    // Moderate composed string
    const decision = await moderate(composed);
    if (decision.action === "block") {
      ui.emit({ type: "error", error: { code: "blocked", reason: decision.reason } });
      return null;
    }
    const finalText = decision.text;

    // Optimistic USER→SYSTEM pair
    const pair = convo.user(finalText);
    convo.beginAssistantWork(pair, { composedPrompt: true });
    lastPair = pair;

    // Send to server; include requestId to correlate future events
    chat.sendMessage({
      messageId: pair.user.id,
      userId: opts.userId,
      text: finalText,
      parts: structuredParts,
      requestId: pair.path.id,
    });
    byRequestId.set(pair.path.id, pair);

    ui.emit({ type: "conversation:update" });
    return pair;
  }

  function abort(reason?: string) {
    chat.abort(reason);
  }

  function markRead(messageIds: string[], readAt = new Date().toISOString()) {
    chat.markRead({ userId: opts.userId, messageIds, readAt });
  }

  // Accessors for renderers
  function getConversation() { return convo; }

  // Example: persist a simple shape (call this in your app on updates)
  function toShape(): Row[] {
    const rows: Row[] = [];
    for (const path of convo.paths) {
      const user = convo.nodes.find(n => n.id === path.fromId);
      const system = convo.nodes.find(n => n.id === path.toId);
      const row: Row = {};
      if (user?.content?.message) {
        row.user = { message: user.content.message, options: user.content.options, timestamp: user.content.timestamp };
      }
      if (system?.content?.message) {
        row.system = { message: system.content.message, options: system.content.options, timestamp: system.content.timestamp };
      }
      row.status = path.process.status as Row["status"];
      if (row.user || row.system) rows.push(row);
    }
    return rows;
  }

  // Example: quick & dirty renderer stub — replace with your UI framework
  function render() {
    // You can read convo.nodes / convo.paths here to paint bubbles, status, etc.
    // For demo purposes we just emit a single event:
    ui.emit({ type: "conversation:update" });
  }

  // Wire auto-render on every UI event consumer cares about (optional)
  ui.on(evt => {
    if (evt.type === "system:update" || evt.type === "ai:token" || evt.type === "ai:message" || evt.type === "status:change") {
      // e.g., throttle re-render if needed
    }
  });

  // return a minimal “SDK-like” surface
  return {
    send,
    abort,
    markRead,
    getConversation,
    onUIEvent: ui.on,
    toShape,
    rebuild: (rows: Row[]) => { convo = rebuildConversationFromShape(rows); render(); },

    // for completeness; you can expose the low-level objects too:
    socket: chat,
    typing,
  };
}

// ---------- Example usage in your app ----------
// const sdk = initChatDemo({
//   socketUrl: import.meta.env.VITE_SOCKET_URL,
//   chatId: "room-42",
//   userId: "u-123",
//   inputSelector: "#message",
//   onUIEvent: (evt) => console.log("UI:", evt),
// });
// sdk.send("Hello there");

