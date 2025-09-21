/*
 * AIChatSocket.ts
 * ------------------------------------------------------------
 * A high-level, callback-driven AI chat client built on top of the
 * base SocketService<E>. Strongly typed via ChatEvents.
 *
 * Responsibilities:
 * - Manage connection & room join (chatId)
 * - Expose clear methods: sendMessage, typingStart/Stop, abort, markRead
 * - Wire server events (ai:processing, ai:token, ai:message, ai:error, etc.)
 *   to the provided callbacks
 * - Allow full socket configuration passthrough (auth, transports, etc.)
 */

import type { ChatEvents, ChatID, UserID } from "@sockets/ChatEvents";
import { SocketService, type EventMapLike, type HandlerMap } from "@sockets/SocketService";

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

export interface AIChatSocketOptions {
  /** Required socket URL (e.g., https://realtime.example.com). */
  url: string;
  /** Chat room identifier to join. */
  chatId: ChatID;
  /** Optional: custom join event (default: "chat:join"). */
  joinEvent?: string;

  /**
   * Socket.IO client options (auth, transports, path, extraHeaders, query, etc.)
   * forwarded to the base SocketService -> socket.io-client.
   */
  ioOptions?: Parameters<SocketService<EventMapLike>["emit"]>[2] extends never
    ? Parameters<typeof import("socket.io-client").io>[1]
    : Parameters<typeof import("socket.io-client").io>[1];

  /** Initial callbacks; can be updated later via setCallbacks(). */
  callbacks?: AIChatCallbacks;

  /** Auto-connect now (default: true). If false, call connect(). */
  autoConnect?: boolean;

  /** Server error event name (default: "error"). */
  serverErrorEvent?: string;
}

/**
 * AIChatSocket wraps SocketService<ChatEvents> and provides a focused
 * AI chat interface that writes all server events into user-provided callbacks.
 */
export class AIChatSocket {
  private readonly chatId: ChatID;
  private readonly service: SocketService<ChatEvents>;
  private callbacks: AIChatCallbacks;

  constructor(options: AIChatSocketOptions) {
    this.chatId = options.chatId;
    this.callbacks = options.callbacks ?? {};

    // Pre-wire handlers so server messages feed into the callbacks.
    const handlers: HandlerMap<ChatEvents> = {
      "chat:message": (e) => this.callbacks.onChatMessage?.(e),
      "presence:update": (e) => this.callbacks.onPresenceUpdate?.(e),
      "ai:processing": (e) => this.callbacks.onAIProcessing?.(e),
      "ai:token": (e) => this.callbacks.onAIToken?.(e),
      "ai:message": (e) => this.callbacks.onAIMessage?.(e),
      "ai:error": (e) => this.callbacks.onAIError?.(e),
      "ai:tool_call": (e) => this.callbacks.onAIToolCall?.(e),
      "ai:tool_result": (e) => this.callbacks.onAIToolResult?.(e),
    };

    this.service = new SocketService<ChatEvents>({
      url: options.url,
      chatId: options.chatId,
      joinEvent: options.joinEvent ?? "chat:join",
      ioOptions: options.ioOptions,
      handlers,
      autoConnect: options.autoConnect ?? true,
      serverErrorEvent: options.serverErrorEvent ?? "error",
    });

    // Bubble up connection lifecycle to callbacks.
    // We use the base socket events by observing isConnected changes.
    // (If you expose connection events on the server, you can also hook those.)
    if (this.service.isConnected()) {
      this.callbacks.onConnect?.({ chatId: this.chatId });
    }
    // Best effort: attach low-level listeners
    // Note: SocketService currently encapsulates the socket; we rely on
    // handlers and consumer knowledge for deeper connection hooks if needed.
  }

  /** Update callbacks at runtime (e.g., when React components remount). */
  setCallbacks(callbacks: Partial<AIChatCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /** Explicitly connect (only needed if autoConnect=false). */
  connect(): void {
    // Register handlers again is unnecessary; SocketService handles it.
    // Connect triggers join automatically via SocketService.
    this.service.connect();
    this.callbacks.onConnect?.({ chatId: this.chatId });
  }

  /** Disconnect & cleanup. */
  disconnect(): void {
    this.service.disconnect();
    this.callbacks.onDisconnect?.({ chatId: this.chatId });
  }

  /** Whether the underlying socket is connected. */
  isConnected(): boolean {
    return this.service.isConnected();
  }

  /* -------------------- Client → Server helpers -------------------- */

  /** Send a user message to the server for AI processing. */
  sendMessage(params: {
    messageId: string;
    userId: UserID;
    text: string;
    parts?: Array<{ type: "text" | "image" | "file"; value: unknown }>;
    traceId?: string;
    requestId?: string;
  }): void {
    this.service.emit("user:message", {
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
    this.service.emit("user:typingStart", { chatId: this.chatId, userId, traceId });
  }

  /** Inform the server the user stopped typing. */
  typingStop(userId: UserID, traceId?: string): void {
    this.service.emit("user:typingStop", { chatId: this.chatId, userId, traceId });
  }

  /** Ask the server to abort the current AI response. */
  abort(reason?: string, traceId?: string): void {
    this.service.emit("ai:abort", { chatId: this.chatId, reason, traceId });
  }

  /** Mark messages as read. */
  markRead(params: { userId: UserID; messageIds: string[]; readAt: string; traceId?: string }): void {
    this.service.emit("chat:read", { chatId: this.chatId, ...params });
  }
}
