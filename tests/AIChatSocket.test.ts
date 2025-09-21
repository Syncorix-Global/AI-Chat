// tests/AIChatSocket.test.ts
import { describe, it, expect, vi } from "vitest";

// ✅ Mock BEFORE importing the SUT. Register initial handlers + autoconnect.
vi.mock("@sockets/SocketService", () => {
  class FakeSocketService<E extends object> {
    connected = false;
    private handlers = new Map<string, Function[]>();

    constructor(opts: {
      handlers?: Partial<{ [K in keyof E]: (p: E[K]) => void }>;
      autoConnect?: boolean;
      // other opts ignored for the fake
    } = {}) {
      // register initial handlers like the real service does
      if (opts.handlers) {
        for (const [evt, fn] of Object.entries(opts.handlers)) {
          if (fn) this.on(evt as keyof E & string, fn as any);
        }
      }
      if (opts.autoConnect ?? true) this.connect();
    }

    connect() { this.connected = true; }
    disconnect() { this.connected = false; }
    isConnected() { return this.connected; }

    on<K extends keyof E & string>(event: K, fn: (payload: E[K]) => void) {
      const arr = this.handlers.get(event) ?? [];
      this.handlers.set(event, [...arr, fn]);
      return () => this.off(event, fn);
    }

    off<K extends keyof E & string>(event: K, fn: (payload: E[K]) => void) {
      const arr = this.handlers.get(event) ?? [];
      this.handlers.set(event, arr.filter((f) => f !== fn));
    }

    emit<K extends keyof E & string>(event: K, payload: E[K]) {
      (this.handlers.get(event) ?? []).forEach((f) => f(payload));
    }
  }
  return { SocketService: FakeSocketService };
});

// 🔽 Import after the mock so it uses our fake
import type { ChatEvents } from "@sockets/ChatEvents";
import { AIChatSocket } from "@sockets/AIChatSockets"; // or "@sockets/AIChatSockets" if plural in your repo

describe("AIChatSocket", () => {
  const url = "http://test.local";
  const chatId = "room-1";

  it("wires server events into callbacks", () => {
    const onAIMessage = vi.fn();
    const onAIToken = vi.fn();
    const onProcessing = vi.fn();

    const chat = new AIChatSocket({
      url,
      chatId,
      callbacks: {
        onAIMessage,
        onAIToken,
        onAIProcessing: onProcessing,
      },
      autoConnect: true,
    });

    // Access the fake's API to simulate server pushes
    const svc = (chat as any).service as {
      emit: <K extends keyof ChatEvents & string>(e: K, p: ChatEvents[K]) => void;
    };

    // Simulate server → client events
    svc.emit("ai:processing", { chatId, status: "working" });
    svc.emit("ai:token", { chatId, token: "He", index: 0, done: false });
    svc.emit("ai:message", {
      chatId,
      messageId: "m1",
      role: "assistant",
      text: "Hello",
      createdAt: new Date().toISOString(),
    });

    expect(onProcessing).toHaveBeenCalledWith({ chatId, status: "working" });
    expect(onAIToken).toHaveBeenCalledWith({ chatId, token: "He", index: 0, done: false });
    expect(onAIMessage).toHaveBeenCalled();
    expect(onAIMessage.mock.calls.slice(-1)[0][0].text).toBe("Hello");
  });

  it("exposes helpers: sendMessage, typingStart/Stop, abort, markRead", () => {
    const chat = new AIChatSocket({ url, chatId, autoConnect: true });
    const svc = (chat as any).service as {
      emit: (e: keyof ChatEvents & string, p: any) => void;
    };
    const emitSpy = vi.spyOn(svc, "emit");

    chat.sendMessage({ messageId: "u1", userId: "user-1", text: "Hi" });
    chat.typingStart("user-1");
    chat.typingStop("user-1");
    chat.abort("user canceled");
    chat.markRead({ userId: "user-1", messageIds: ["m1"], readAt: new Date().toISOString() });

    expect(emitSpy).toHaveBeenCalledWith("user:message", expect.objectContaining({ text: "Hi" }));
    expect(emitSpy).toHaveBeenCalledWith("user:typingStart", expect.objectContaining({ userId: "user-1" }));
    expect(emitSpy).toHaveBeenCalledWith("user:typingStop", expect.objectContaining({ userId: "user-1" }));
    expect(emitSpy).toHaveBeenCalledWith("ai:abort", expect.objectContaining({ reason: "user canceled" }));
    expect(emitSpy).toHaveBeenCalledWith("chat:read", expect.objectContaining({ messageIds: ["m1"] }));
  });
});
