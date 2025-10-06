import { io, type Socket, type ManagerOptions, type SocketOptions } from "socket.io-client";

/** Any object with named events -> payload types */
export type EventMapLike = Record<string, any>;

/** Typed/loose listener for a given payload. */
export type Listener<Payload = any> = (payload: Payload) => void;

/** Optional per-event handler map for auto-registration (allows custom strings). */
export type HandlerMap<E extends EventMapLike> = Partial<
  Record<keyof E | string, Listener<any>>
>;

/** Options for constructing the service. */
export interface SocketServiceOptions<E extends EventMapLike> {
  url: string;

  /** (Legacy) Optional room/chat identifier. */
  chatId?: string | number;

  /** Server event to join a room/channel (default: "chat:join"). Set to null to skip join emit. */
  joinEvent?: string | null;

  /** Optional arbitrary payload to send when emitting the join event (takes precedence over chatId). */
  joinPayload?: any;

  /** socket.io-client options (auth, transports, path, etc.). */
  ioOptions?: Partial<ManagerOptions & SocketOptions>;

  /** Initial handlers (optional). */
  handlers?: HandlerMap<E>;

  /** Autoconnect on construct (default: true). */
  autoConnect?: boolean;

  /** Name of server error event (default: "error"). */
  serverErrorEvent?: string;
}

/**
 * Reusable Socket.IO service with dynamic event support.
 */
export class SocketService<E extends EventMapLike> {
  private socket!: Socket;
  private readonly url: string;
  private readonly chatId?: string | number;
  private readonly joinEvent?: string | null;
  private readonly serverErrorEvent: string;
  private readonly ioOptions?: Partial<ManagerOptions & SocketOptions>;
  private readonly joinPayload?: any;
  private connected = false;

  private registeredHandlers: Array<{ event: keyof E | string; listener: (...args: any[]) => void }> = [];
  private anyListeners: Array<(event: string, ...args: any[]) => void> = [];

  constructor(options: SocketServiceOptions<E>) {
    this.url = options.url;
    this.chatId = options.chatId;
    this.joinEvent = options.joinEvent ?? "chat:join";
    this.ioOptions = options.ioOptions;
    this.serverErrorEvent = options.serverErrorEvent ?? "error";
    this.joinPayload = options.joinPayload;

    if (options.autoConnect ?? true) {
      this.connect(options.handlers);
    }
  }

  /** Initialize socket connection & (optionally) register initial handlers. */
  connect(initialHandlers?: HandlerMap<E>): void {
    if (this.socket?.connected || this.connected) return;

    this.socket = io(this.url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      ...this.ioOptions,
    });

    this.socket.on("connect", () => {
      this.connected = true;

      // Only emit a join if joinEvent is provided (not null/undefined).
      if (this.joinEvent) {
        // If joinPayload is given, use it; else fall back to legacy { chatId } if present; else emit undefined.
        const payload = (this.joinPayload !== undefined)
          ? this.joinPayload
          : (this.chatId !== undefined ? { chatId: this.chatId } : undefined);
        this.socket.emit(this.joinEvent, payload as any);
      }
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
    });

    this.socket.on(this.serverErrorEvent, (err: unknown) => {
      console.error("[SocketService] Server error:", err);
    });

    // Wire onAny for wildcard hooks (guard if client/mocks don't support it)
    const s: any = this.socket as any;
    if (typeof s.onAny === "function") {
      s.onAny((event: string, ...args: any[]) => {
        for (const l of this.anyListeners) l(event, ...args);
      });
    }

    if (initialHandlers) {
      Object.entries(initialHandlers).forEach(([event, listener]) => {
        if (listener) this.on(event, listener as any);
      });
    }
  }

  /** Disconnect & remove all registered listeners. */
  disconnect(): void {
    if (!this.socket) return;
    this.registeredHandlers.forEach(({ event, listener }) => {
      this.socket.off(event as string, listener);
    });
    this.registeredHandlers = [];
    this.anyListeners = [];
    this.socket.disconnect();
    this.connected = false;
  }

  destroy(): void {
    this.disconnect();
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  /** Subscribe to a (possibly dynamic) event; returns an unsubscribe function. */
  on(event: keyof E | string, listener: Listener<any>): () => void {
    this.socket.on(event as string, listener as any);
    this.registeredHandlers.push({ event, listener });
    return () => this.off(event, listener);
  }

  /** Remove a previously registered listener. */
  off(event: keyof E | string, listener: Listener<any>): void {
    this.socket.off(event as string, listener as any);
    this.registeredHandlers = this.registeredHandlers.filter(
      (l) => !(l.event === event && l.listener === listener)
    );
  }

  /** Wildcard subscription to observe all events. */
  onAny(listener: (event: string, ...args: any[]) => void): () => void {
    this.anyListeners.push(listener);
    return () => {
      this.anyListeners = this.anyListeners.filter((l) => l !== listener);
    };
  }

  /** Emit a (possibly dynamic) event to the server (optionally with an ack). */
  emit(event: keyof E | string, payload?: any, ack?: (response: unknown) => void): void {
    if (ack) this.socket.emit(event as string, payload, ack);
    else this.socket.emit(event as string, payload);
  }

  /** Low-level connect hook (used by AIChatSocket & tests) */
  onConnect(listener: () => void): () => void {
    this.socket.on("connect", listener);
    return () => this.socket.off("connect", listener);
  }

  /** Low-level disconnect hook (symmetry + tests) */
  onDisconnect(listener: () => void): () => void {
    this.socket.on("disconnect", listener);
    return () => this.socket.off("disconnect", listener);
  }
}
