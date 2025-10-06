# AI Chat Socket Layer

This folder provides a typed, modular abstraction for working with Socket.IO in real-time chat and AI streaming contexts.  
It is broken into three layers:

1. **ChatEvents** — The strongly typed event map (contract between client and server).
2. **SocketService** — A reusable, generic wrapper around Socket.IO that enforces type safety.
3. **AIChatSocket** — A higher-level chat-specific class that builds on `SocketService` and exposes a clean callback-driven API for real-time AI chat.

---

## 📦 Files

- `ChatEvents.ts` — Defines all event names and payload types.
- `SocketService.ts` — Generic typed Socket.IO client wrapper.
- `AIChatSocket.ts` — Specialized chat service using the base `SocketService`.

---

## 1. ChatEvents

### Purpose
Provides the **typed event contract** between client and server.  
Every event name is declared explicitly with the exact payload structure it carries.

### Example (simplified excerpt)
```ts
export interface ChatEvents {
  "user:message": {
    chatId?: string | number; // optional if your backend doesn't use rooms
    messageId: string;
    userId: string | number;
    text: string;
    parts?: Array<{ type: "text" | "image" | "file"; value: unknown }>;
    requestId?: string;  // correlate with ai:token/ai:message
  };

  "ai:processing": {
    chatId?: string | number;
    status: "queued" | "working" | "retrying";
    etaMs?: number;
    reason?: string;
    requestId?: string;
  };

  "ai:token": {
    chatId?: string | number;
    token: string;
    index: number;
    done?: false;
    requestId?: string;
  };

  "ai:message": {
    chatId?: string | number;
    messageId: string;
    role: "assistant";
    text: string;
    createdAt: string;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    options?: string[];
    requestId?: string;
  };

  "ai:error": {
    chatId?: string | number;
    code?: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };

  "presence:update": {
    chatId?: string | number;
    onlineUserIds: Array<string | number>;
  };
}
```

### Why it matters
- Guarantees type safety across the stack.
- Autocompletion of event names and payloads in TypeScript.
- Reduces runtime errors from mis-shaped payloads.

---

## 2. SocketService

### Purpose
A **generic, reusable wrapper** around Socket.IO client.  
It provides:
- Typed `emit`, `on`, and `off`.
- **Join control**: automatic room join (`chat:join` by default) *or* skip joins entirely.
- Lifecycle management (connect/disconnect/destroy).
- Initial handler registration.

### API
```ts
export class SocketService<E extends object> {
  constructor(options: {
    url: string;
    chatId?: string | number;            // optional for backends without rooms
    joinEvent?: string | null;           // default: "chat:join"; null → skip join
    joinPayload?: any;                   // custom payload for join (if used)
    ioOptions?: import("socket.io-client").ManagerOptions
             &   import("socket.io-client").SocketOptions; // supports query/auth
    handlers?: Partial<Record<keyof E | string, (payload: any) => void>>;
    autoConnect?: boolean;               // default: true
    serverErrorEvent?: string;           // default: "error"
  });

  connect(initialHandlers?: typeof this.handlers): void;
  disconnect(): void;
  destroy(): void;

  isConnected(): boolean;

  on(event: keyof E | string, listener: (payload: any) => void): () => void;
  off(event: keyof E | string, listener: (payload: any) => void): void;

  emit(event: keyof E | string, payload?: any, ack?: (response: unknown) => void): void;

  // Wildcard (if supported by client) — surfaced via AIChatSocket for convenience
  onAny?(listener: (event: string, ...args: any[]) => void): () => void;
}
```

### Usage Example
```ts
import { SocketService } from "@sockets/SocketService";
import type { ChatEvents } from "@sockets/ChatEvents";

const service = new SocketService<ChatEvents>({
  url: "https://realtime.example.com",
  chatId: "room-1",
  autoConnect: true,
  handlers: {
    "ai:message": (evt) => console.log("AI message:", evt.text),
  }
});

service.emit("user:message", {
  chatId: "room-1",
  messageId: "u1",
  userId: "user-123",
  text: "Hello!"
});
```

> **New (optional)**: If your backend doesn’t use rooms, set `joinEvent: null` and omit `chatId`. If it needs a custom handshake, provide `joinEvent: "custom:join"` + `joinPayload: {...}`. Arbitrary connect params (e.g., `consultationId`) can be passed via `ioOptions.query` or `ioOptions.auth`.

---

## 3. AIChatSocket

### Purpose
Builds on `SocketService<ChatEvents>` to provide a **focused chat API**:  
- Clean, callback-driven interface for AI + human chat events.
- Helper methods for common actions (`sendMessage`, `typingStart`, `abort`, `markRead`, etc).
- **Dynamic topic remapping** and optional **runtime discovery** so the client adapts to backend naming.
- Wildcard and raw hooks for debugging or custom integrations.

### API
```ts
export class AIChatSocket {
  constructor(options: {
    url: string;
    chatId?: string | number; // optional for servers without rooms
    joinEvent?: string | null; // default: "chat:join"; null → skip join
    joinPayload?: any;
    ioOptions?: import("socket.io-client").ManagerOptions & import("socket.io-client").SocketOptions;
    callbacks?: AIChatCallbacks;
    autoConnect?: boolean;   // default: true
    serverErrorEvent?: string;

    // Dynamic topics
    eventNames?: Partial<Record<EventKey, string>>;
    eventResolver?: (key: EventKey, defaultName: string) => string;

    // Optional discovery (server advertises topic names)
    discoverEvents?: boolean;
    discoveryRequestEvent?: string;  // default: "meta:events:request"
    discoveryResponseEvent?: string; // default: "meta:events:response"

    // Per-emit meta (merged into every client→server emit)
    meta?: Record<string, unknown>;
  });

  setCallbacks(callbacks: Partial<AIChatCallbacks>): void;
  setEventNames(map: Partial<Record<EventKey, string>>): void;
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;

  // Client → Server helpers
  sendMessage(params: {
    messageId: string;
    userId: string | number;
    text: string;
    parts?: Array<{ type: "text" | "image" | "file"; value: unknown }>;
    traceId?: string;
    requestId?: string;
  }): void;

  typingStart(userId: string | number, traceId?: string): void;
  typingStop(userId: string | number, traceId?: string): void;
  abort(reason?: string, traceId?: string): void;
  markRead(params: { userId: string | number; messageIds: string[]; readAt: string; traceId?: string }): void;

  // Advanced: wildcard & raw hooks
  onAny(listener: (event: string, ...args: any[]) => void): () => void;
  emitRaw(event: string, payload?: any): void;
  onRaw(event: string, listener: (payload: any) => void): () => void;
  offRaw(event: string, listener: (payload: any) => void): void;
}
```

### Callbacks
```ts
interface AIChatCallbacks {
  /* Connection lifecycle */
  onConnect?: (info: { chatId: string | number }) => void;
  onDisconnect?: (info: { chatId: string | number }) => void;
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
```

### Usage Example (rooms-based, default)
```ts
import { AIChatSocket } from "@sockets/AIChatSocket";

const chat = new AIChatSocket({
  url: "https://realtime.example.com",
  chatId: "room-1",
  callbacks: {
    onConnect: () => console.log("Connected"),
    onAIProcessing: (e) => console.log("AI status:", e.status),
    onAIToken: (e) => console.log("Streaming:", e.token),
    onAIMessage: (e) => console.log("AI says:", e.text),
    onAIError: (e) => console.error("AI error:", e.message),
  },
  autoConnect: true
});

chat.sendMessage({
  messageId: crypto.randomUUID(),
  userId: "user-123",
  text: "Hello AI!"
});
```

### Usage Example (no rooms + arbitrary params)
```ts
const chat = new AIChatSocket({
  url: "https://realtime.example.com",
  ioOptions: {
    transports: ["websocket"],
    query: { consultationId: "abc-123", tenant: "acme" }, // or: auth: { token }
  },
  joinEvent: null,                        // skip room join
  meta: { consultationId: "abc-123" },    // merged into all emits
  callbacks: {
    onAIMessage: (e) => console.log("AI says:", e.text),
  },
});
```

### Raw topics & discovery (optional)
```ts
// Listen to any backend topic verbatim (no remap needed)
const off = chat.onRaw("consultation-result", (payload) => {
  console.log("consultation-result:", payload);
});
// later: off();

// Ask the server to advertise its topic catalog (if supported)
const s = new AIChatSocket({ url: "...", discoverEvents: true });
```

---

## 🔌 Putting It All Together

- Use `ChatEvents.ts` to define and share your event contract with the backend.
- Use `SocketService.ts` if you want **low-level typed Socket.IO** with reusable patterns.
- Use `AIChatSocket.ts` if you want a **ready-to-go AI chat client** with clean callbacks and helpers.

---

## 🛠 Development Tips

- **Testing:** You can mock `SocketService` in unit tests (as shown in `tests/AIChatSocket.test.ts`).
- **Playground:** Use the Vite playground (`playground/`) and the mock server (`mock-server/`) to iterate quickly.
- **Auth:** Pass tokens/headers via `ioOptions.auth` or `ioOptions.extraHeaders`.
- **Remapping:** Use `eventNames`/`eventResolver`, or enable `discoverEvents` for runtime topic discovery.

---

## 📚 Example Repo Scripts

From repo root:

```bash
pnpm mock:dev        # run mock server on port 4000
pnpm playground:dev  # run vite playground on port 5173
pnpm dev:all         # run both together
```

---

## ✅ Summary

- **ChatEvents:** The **schema** — defines every event payload type.
- **SocketService:** The **engine** — typed Socket.IO wrapper for any event map.
- **AIChatSocket:** The **driver** — chat-specific client with callbacks + helpers, dynamic topics, discovery, and optional no-room/param flows.

Together, they give you a clean, strongly-typed, and extensible foundation for real-time AI chat apps.
