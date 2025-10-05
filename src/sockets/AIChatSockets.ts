/*
 * AIChatSocket.ts
 * ------------------------------------------------------------
 * A high-level, callback-driven AI chat client built on top of the
 * base SocketService<E>. Now supports:
 * - dynamic event names (eventNames / eventResolver)
 * - wildcard subscriptions (onAny)
 * - raw event helpers (emitRaw/onRaw/offRaw)
 * - optional runtime discovery (server advertises topic names)
 */

import type { ChatEvents, ChatID, UserID } from "@sockets/ChatEvents";
import { SocketService, type HandlerMap } from "@sockets/SocketService";

export interface AIChatCallbacks {
  /* Connection lifecycle */
  onConnect?: (info: { chatId: ChatID }) => void;
  onDisconnect?: (info: { chatId: ChatID }) => void;
  onServerError?: (error: unknown) => void;

  /* Human chat */
  onChatMessage?: (event: ChatEvents["chat:message"]) => void;
  onPresenceUpdate?: (event: ChatEvents["presence:update"]) => void;

  /* AI streaming / results */
  onAIProcessing?: (event: ChatEvents["ai:processing"]) => void;
  onAIToken?: (event: ChatEvents["ai:token"]) => void;
  onAIMessage?: (event: ChatEvents["ai:message"]) => void;
  onAIError?: (event: ChatEvents["ai:error"]) => void;

  /* Tools */
  onAIToolCall?: (event: ChatEvents["ai:tool_call"]) => void;
  onAIToolResult?: (event: ChatEvents["ai:tool_result"]) => void;
}

/** Stable logical keys the SDK uses internally */
const DEFAULT_EVENT_KEYS = {
  JOIN: "chat:join",
  USER_MESSAGE: "user:message",
  USER_TYPING_START: "user:typingStart",
  USER_TYPING_STOP: "user:typingStop",
  AI_ABORT: "ai:abort",
  CHAT_READ: "chat:read",
  CHAT_MESSAGE: "chat:message",
  PRESENCE_UPDATE: "presence:update",
  AI_PROCESSING: "ai:processing",
  AI_TOKEN: "ai:token",
  AI_MESSAGE: "ai:message",
  AI_ERROR: "ai:error",
  AI_TOOL_CALL: "ai:tool_call",
  AI_TOOL_RESULT: "ai:tool_result",
} as const;

export type EventKey = keyof typeof DEFAULT_EVENT_KEYS;
export type EventNameMap = Partial<Record<EventKey, string>>;

function resolveEvent(key: EventKey, override?: EventNameMap): string {
  return override?.[key] ?? DEFAULT_EVENT_KEYS[key];
}

export interface AIChatSocketOptions {
  /** Required socket URL (e.g., https://realtime.example.com). */
  url: string;
  /** Chat room identifier to join. */
  chatId: ChatID;

  /** Optional direct join event override (legacy). Prefer eventNames.JOIN. */
  joinEvent?: string;

  /**
   * Socket.IO client options (auth, transports, path, extraHeaders, query, etc.)
   * forwarded to the base SocketService -> socket.io-client.
   */
  ioOptions?: Parameters<typeof import("socket.io-client").io>[1];

  /** Initial callbacks; can be updated later via setCallbacks(). */
  callbacks?: AIChatCallbacks;

  /** Auto-connect now (default: true). If false, call connect(). */
  autoConnect?: boolean;

  /** Server error event name (default: "error"). */
  serverErrorEvent?: string;

  /** Event name overrides: map stable keys -> backend topic names */
  eventNames?: EventNameMap;

  /** Function-based resolver for maximum flexibility */
  eventResolver?: (key: EventKey, defaultName: string) => string;

  /** Enable discovery handshake (server advertises topic names) */
  discoverEvents?: boolean;
  discoveryRequestEvent?: string;  // default: "meta:events:request"
  discoveryResponseEvent?: string; // default: "meta:events:response"
}

/**
 * AIChatSocket wraps SocketService<Record<string, any>> and provides a focused
 * AI chat interface that writes all server events into user-provided callbacks.
 * Event names are configurable at runtime.
 */
export class AIChatSocket {
  private readonly chatId: ChatID;
  private readonly service: SocketService<Record<string, any>>;
  private callbacks: AIChatCallbacks;

  private events: EventNameMap; // user overrides
  private resolver?: (key: EventKey, defaultName: string) => string;

  private name(key: EventKey): string {
    const def = DEFAULT_EVENT_KEYS[key];
    return this.resolver ? this.resolver(key, def) : resolveEvent(key, this.events);
  }

  constructor(options: AIChatSocketOptions) {
    this.chatId = options.chatId;
    this.callbacks = options.callbacks ?? {};
    this.events = options.eventNames ?? {};
    this.resolver = options.eventResolver;

    const handlers: HandlerMap<Record<string, any>> = {
      [this.name("CHAT_MESSAGE")]: (e) => this.callbacks.onChatMessage?.(e),
      [this.name("PRESENCE_UPDATE")]: (e) => this.callbacks.onPresenceUpdate?.(e),
      [this.name("AI_PROCESSING")]: (e) => this.callbacks.onAIProcessing?.(e),
      [this.name("AI_TOKEN")]: (e) => this.callbacks.onAIToken?.(e),
      [this.name("AI_MESSAGE")]: (e) => this.callbacks.onAIMessage?.(e),
      [this.name("AI_ERROR")]: (e) => this.callbacks.onAIError?.(e),
      [this.name("AI_TOOL_CALL")]: (e) => this.callbacks.onAIToolCall?.(e),
      [this.name("AI_TOOL_RESULT")]: (e) => this.callbacks.onAIToolResult?.(e),
    };

    this.service = new SocketService<Record<string, any>>({
      url: options.url,
      chatId: options.chatId,
      joinEvent: options.joinEvent ?? this.name("JOIN"),
      ioOptions: options.ioOptions,
      handlers,
      autoConnect: options.autoConnect ?? true,
      serverErrorEvent: options.serverErrorEvent ?? "error",
    });

    // Connection lifecycle passthrough WITHOUT relying on service.onConnect()
    if (this.service.isConnected()) {
      this.callbacks.onConnect?.({ chatId: this.chatId });
    }
    this.service.on("connect", () => {
      this.callbacks.onConnect?.({ chatId: this.chatId });
    });
    this.service.on("disconnect", () => {
      this.callbacks.onDisconnect?.({ chatId: this.chatId });
    });

    // Optional runtime discovery: ask server for its current topic names
    if (options.discoverEvents) {
      const req = options.discoveryRequestEvent ?? "meta:events:request";
      const res = options.discoveryResponseEvent ?? "meta:events:response";

      // Update map when server responds with catalog: Partial<Record<EventKey,string>>
      this.service.on(res, (catalog: EventNameMap) => {
        if (catalog && typeof catalog === "object") {
          this.setEventNames(catalog);
        }
      });

      const emitDiscovery = () => this.service.emit(req, { chatId: this.chatId });
      if (this.service.isConnected()) emitDiscovery();
      else this.service.on("connect", emitDiscovery);
    }
  }

  /** Update callbacks at runtime (e.g., when React components remount). */
  setCallbacks(callbacks: Partial<AIChatCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /** Allow changing event map at runtime */
  setEventNames(map: EventNameMap): void {
    this.events = { ...this.events, ...map };
  }

  /** Explicitly connect (only needed if autoConnect=false). */
  connect(): void {
    this.service.connect();
    // connect event will trigger callback when actually connected
  }

  /** Disconnect & cleanup. */
  disconnect(): void {
    this.service.disconnect();
  }

  /** Whether the underlying socket is connected. */
  isConnected(): boolean {
    return this.service.isConnected();
  }

  /* -------------------- Client → Server helpers (using dynamic names) -------------------- */

  /** Send a user message to the server for AI processing. */
  sendMessage(params: {
    messageId: string;
    userId: UserID;
    text: string;
    parts?: Array<{ type: "text" | "image" | "file"; value: unknown }>;
    traceId?: string;
    requestId?: string;
  }): void {
    this.service.emit(this.name("USER_MESSAGE"), {
      chatId: this.chatId,
      messageId: params.messageId,
      userId: params.userId,
      text: params.text,
      parts: params.parts,
      traceId: params.traceId,
      requestId: params.requestId,
    });
  }

  /** Inform the server the user started typing. */
  typingStart(userId: UserID, traceId?: string): void {
    this.service.emit(this.name("USER_TYPING_START"), { chatId: this.chatId, userId, traceId });
  }

  /** Inform the server the user stopped typing. */
  typingStop(userId: UserID, traceId?: string): void {
    this.service.emit(this.name("USER_TYPING_STOP"), { chatId: this.chatId, userId, traceId });
  }

  /** Ask the server to abort the current AI response. */
  abort(reason?: string, traceId?: string): void {
    this.service.emit(this.name("AI_ABORT"), { chatId: this.chatId, reason, traceId });
  }

  /** Mark messages as read. */
  markRead(params: { userId: UserID; messageIds: string[]; readAt: string; traceId?: string }): void {
    this.service.emit(this.name("CHAT_READ"), { chatId: this.chatId, ...params });
  }

  /* -------------------- Advanced: wildcard & raw APIs -------------------- */

  /** Wildcard subscription for all events (debugging/dynamic integrations). */
  onAny(listener: (event: string, ...args: any[]) => void): () => void {
    return this.service.onAny(listener);
  }

  /** Fire any custom event (completely raw). */
  emitRaw(event: string, payload?: any): void {
    this.service.emit(event, payload);
  }

  /** Listen to any custom event (completely raw). */
  onRaw(event: string, listener: (payload: any) => void): () => void {
    return this.service.on(event, listener as any);
  }

  /** Remove a raw listener. */
  offRaw(event: string, listener: (payload: any) => void): void {
    this.service.off(event, listener as any);
  }
}
