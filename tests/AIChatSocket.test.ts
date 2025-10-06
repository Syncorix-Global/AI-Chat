import { describe, it, expect, vi } from "vitest";

/**
 * ✅ Mock BEFORE importing the SUT.
 * We simulate the base SocketService with:
 * - initial handler registration
 * - connect/disconnect flags
 * - typed-ish on/off/emit
 *
 * Notes:
 * - We allow ANY string event name so AIChatSocket's dynamic mapping and raw topics work.
 * - We don't enforce event typings at runtime in the fake (keeps tests flexible).
 */
vi.mock("@sockets/SocketService", () => {
  class FakeSocketService<E extends object> {
    connected = false;
    private handlers = new Map<string, Function[]>();

    constructor(opts: {
      handlers?: Partial<Record<keyof E | string, (p: any) => void>>;
      autoConnect?: boolean;
      // other opts ignored for the fake
    } = {}) {
      // register initial handlers like the real service does
      if (opts.handlers) {
        for (const [evt, fn] of Object.entries(opts.handlers)) {
          if (fn) this.on(evt as string, fn as any);
        }
      }
      if (opts.autoConnect ?? true) this.connect();
    }

    connect() { this.connected = true; }
    disconnect() { this.connected = false; }
    isConnected() { return this.connected; }

    on(event: string, fn: (payload: any) => void) {
      const arr = this.handlers.get(event) ?? [];
      this.handlers.set(event, [...arr, fn]);
      return () => this.off(event, fn);
    }

    off(event: string, fn: (payload: any) => void) {
      const arr = this.handlers.get(event) ?? [];
      this.handlers.set(event, arr.filter((f) => f !== fn));
    }

    emit(event: string, payload?: any) {
      (this.handlers.get(event) ?? []).forEach((f) => f(payload));
    }
  }
  return { SocketService: FakeSocketService };
});

// 🔽 Import after the mock so it uses our fake
import type { ChatEvents } from "@sockets/ChatEvents";
import { AIChatSocket } from "@sockets/AIChatSockets"; // or "@sockets/AIChatSocket" if singular in your repo

describe("AIChatSocket", () => {
  const url = "http://test.local";
  const chatId = "room-1";

  it("wires server events into callbacks (rooms backend)", () => {
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

    // Access the fake service to simulate server → client pushes
    const svc = (chat as any).service as {
      emit: (e: keyof ChatEvents & string, p: ChatEvents[typeof e]) => void;
    };

    // Simulate server → client events
    svc.emit("ai:processing", { chatId, status: "working" } as ChatEvents["ai:processing"]);
    svc.emit("ai:token", { chatId, token: "He", index: 0, done: false } as ChatEvents["ai:token"]);
    svc.emit("ai:message", {
      chatId,
      messageId: "m1",
      role: "assistant",
      text: "Hello",
      createdAt: new Date().toISOString(),
    } as ChatEvents["ai:message"]);

    expect(onProcessing).toHaveBeenCalledWith(expect.objectContaining({ chatId, status: "working" }));
    expect(onAIToken).toHaveBeenCalledWith(expect.objectContaining({ chatId, token: "He", index: 0, done: false }));
    expect(onAIMessage).toHaveBeenCalled();
    expect(onAIMessage.mock.calls.slice(-1)[0][0].text).toBe("Hello");
  });

  it("exposes helpers and stamps meta into client→server emits (no rooms + arbitrary params)", () => {
    const chat = new AIChatSocket({
      url,
      // no chatId; backend doesn't use rooms
      joinEvent: null, // explicitly skip join for no-room servers
      ioOptions: {
        transports: ["websocket"],
        query: { consultationId: "abc-123" }, // arbitrary connect params
      },
      // should be merged into EVERY client→server emit
      meta: { consultationId: "abc-123", tenant: "acme" },
      autoConnect: true,
    });

    const svc = (chat as any).service as {
      emit: (e: string, p: any) => void;
    };
    const emitSpy = vi.spyOn(svc, "emit");

    const nowISO = new Date().toISOString();

    chat.sendMessage({ messageId: "u1", userId: "user-1", text: "Hi" });
    chat.typingStart("user-1");
    chat.typingStop("user-1");
    chat.abort("user canceled");
    chat.markRead({ userId: "user-1", messageIds: ["m1"], readAt: nowISO });

    // Assert payloads contain the meta fields (don't try to spread asymmetric matchers)
    expect(emitSpy).toHaveBeenCalledWith(
      "user:message",
      expect.objectContaining({
        text: "Hi",
        consultationId: "abc-123",
        tenant: "acme",
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      "user:typingStart",
      expect.objectContaining({
        userId: "user-1",
        consultationId: "abc-123",
        tenant: "acme",
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      "user:typingStop",
      expect.objectContaining({
        userId: "user-1",
        consultationId: "abc-123",
        tenant: "acme",
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      "ai:abort",
      expect.objectContaining({
        reason: "user canceled",
        consultationId: "abc-123",
        tenant: "acme",
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      "chat:read",
      expect.objectContaining({
        userId: "user-1",
        messageIds: ["m1"],
        readAt: nowISO,
        consultationId: "abc-123",
        tenant: "acme",
      })
    );
  });

  it("supports raw topic listeners without remapping (onRaw/emitRaw)", () => {
    const chat = new AIChatSocket({ url, chatId, autoConnect: true });

    const payload = [{ code: "C001", amount: 42 }];
    const onResult = vi.fn();

    // subscribe to a backend-specific topic
    const off = chat.onRaw("consultation-result", onResult);

    // push that topic through the fake service
    const svc = (chat as any).service as { emit: (e: string, p: any) => void };
    svc.emit("consultation-result", payload);

    expect(onResult).toHaveBeenCalledWith(payload);

    // cleanup
    off();

    // also verify emitRaw routes to the underlying service
    const emitSpy = vi.spyOn(svc, "emit");
    chat.emitRaw("custom:event", { hello: "world" });
    expect(emitSpy).toHaveBeenCalledWith("custom:event", { hello: "world" });
  });

  it("respects event-name overrides when emitting (dynamic mapping)", () => {
    const chat = new AIChatSocket({
      url,
      chatId,
      autoConnect: true,
      eventNames: {
        USER_MESSAGE: "chat/user_message", // override default "user:message"
      },
    });

    const svc = (chat as any).service as { emit: (e: string, p: any) => void };
    const emitSpy = vi.spyOn(svc, "emit");

    chat.sendMessage({ messageId: "u2", userId: "user-2", text: "Howdy" });

    // the custom event name should be used
    expect(emitSpy).toHaveBeenCalledWith(
      "chat/user_message",
      expect.objectContaining({ text: "Howdy" })
    );
  });
});
