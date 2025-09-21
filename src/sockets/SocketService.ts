// SocketService.ts
import { io, type Socket, type ManagerOptions, type SocketOptions } from "socket.io-client";

/** Any object with named events -> payload types */
export type EventMapLike = object;

/** Typed listener for a given payload. */
export type Listener<Payload> = (payload: Payload) => void;

/** Optional per-event handler map for auto-registration. */
export type HandlerMap<E extends EventMapLike> = Partial<{
  [K in keyof E]: Listener<E[K]>;
}>;

/** Options for constructing the service. */
export interface SocketServiceOptions<E extends EventMapLike> {
  url: string;
  chatId: string | number;

  /** Server event to join a room/channel (default: "chat:join"). */
  joinEvent?: string;

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
 * Reusable, strongly-typed Socket.IO service.
 */
export class SocketService<E extends EventMapLike> {
  private socket!: Socket;
  private readonly url: string;
  private readonly chatId: string | number;
  private readonly joinEvent: string;
  private readonly serverErrorEvent: string;
  private readonly ioOptions?: Partial<ManagerOptions & SocketOptions>;
  private connected = false;

  private registeredHandlers: Array<{ event: keyof E | string; listener: (...args: any[]) => void }> = [];

  constructor(options: SocketServiceOptions<E>) {
    this.url = options.url;
    this.chatId = options.chatId;
    this.joinEvent = options.joinEvent ?? "chat:join";
    this.ioOptions = options.ioOptions;
    this.serverErrorEvent = options.serverErrorEvent ?? "error";

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
      this.socket.emit(this.joinEvent, { chatId: this.chatId });
    });

    this.socket.on("disconnect", () => {
      this.connected = false;
    });

    this.socket.on(this.serverErrorEvent, (err: unknown) => {
       
      console.error("[SocketService] Server error:", err);
    });

    if (initialHandlers) {
      (Object.entries(initialHandlers) as Array<[keyof E, Listener<any>]>) // typed cast
        .forEach(([event, listener]) => {
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
    this.socket.disconnect();
    this.connected = false;
  }

  destroy(): void {
    this.disconnect();
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  /** Subscribe to a typed event; returns an unsubscribe function. */
  on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    this.socket.on(event as string, listener as any);
    this.registeredHandlers.push({ event, listener });
    return () => this.off(event, listener);
  }

  /** Remove a previously registered listener. */
  off<K extends keyof E>(event: K, listener: Listener<E[K]>): void {
    this.socket.off(event as string, listener as any);
    this.registeredHandlers = this.registeredHandlers.filter(
      (l) => !(l.event === event && l.listener === listener)
    );
  }

  /** Emit a typed event to the server (optionally with an ack). */
  emit<K extends keyof E>(event: K, payload: E[K], ack?: (response: unknown) => void): void {
    if (ack) this.socket.emit(event as string, payload, ack);
    else this.socket.emit(event as string, payload);
  }
}
