import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketService } from "@sockets/SocketService";

// A tiny fake Socket.IO client returned by io()
const listeners = new Map<string, Function[]>();
const fakeSocket = {
  connected: false,
  on: (ev: string, fn: Function) => {
    const arr = listeners.get(ev) ?? [];
    listeners.set(ev, [...arr, fn]);
  },
  off: (ev: string, fn: Function) => {
    const arr = listeners.get(ev) ?? [];
    listeners.set(ev, arr.filter((f) => f !== fn));
  },
  emit: vi.fn(),
  disconnect: vi.fn(() => { fakeSocket.connected = false; }),
};

vi.mock("socket.io-client", () => {
  return {
    io: vi.fn((_url: string, _opts?: any) => {
      // fresh state for each connect
      listeners.clear();
      fakeSocket.connected = true;
      // trigger connect async-ish
      queueMicrotask(() => {
        (listeners.get("connect") ?? []).forEach((f) => f());
      });
      return fakeSocket as any;
    }),
  };
});

type EMap = {
  "chat:join": { chatId: string };
  "ping": { time: number };
  "pong": { time: number };
};

describe("SocketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    fakeSocket.connected = false;
  });

  it("connects and emits join event with chatId", async () => {
    const svc = new SocketService<EMap>({
      url: "http://localhost",
      chatId: "room-7",
      joinEvent: "chat:join",
      autoConnect: true,
    });

    // Allow queued microtask to run
    await Promise.resolve();

    expect(fakeSocket.connected).toBe(true);
    expect(fakeSocket.emit).toHaveBeenCalledWith("chat:join", { chatId: "room-7" });
  });

  it("registers and invokes handlers", async () => {
    const svc = new SocketService<EMap>({
      url: "http://localhost",
      chatId: "room-7",
      autoConnect: true,
    });

    const onPong = vi.fn();
    svc.on("pong", onPong);

    // Simulate server -> client
    (listeners.get("pong") ?? []).forEach((f) => f({ time: 123 }));

    expect(onPong).toHaveBeenCalledWith({ time: 123 });

    // emit client -> server
    svc.emit("ping", { time: 456 });
    expect(fakeSocket.emit).toHaveBeenCalledWith("ping", { time: 456 });
  });
});
