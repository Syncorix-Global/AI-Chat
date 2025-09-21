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
    chatId: string;
    messageId: string;
    userId: string;
    text: string;
  };

  "ai:processing": {
    chatId: string;
    status: "queued" | "working" | "retrying";
    etaMs?: number;
  };

  "ai:token": {
    chatId: string;
    token: string;
    index: number;
    done?: false;
  };

  "ai:message": {
    chatId: string;
    messageId: string;
    role: "assistant";
    text: string;
    createdAt: string;
  };

  "ai:error": {
    chatId: string;
    code?: string;
    message: string;
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
- Automatic join to a room (`chat:join` by default).
- Lifecycle management (connect/disconnect/destroy).
- Initial handler registration.

### API
```ts
export class SocketService<E extends object> {
  constructor(options: {
    url: string;
    chatId: string | number;
    joinEvent?: string;             // default: "chat:join"
    ioOptions?: SocketOptions;      // socket.io-client options
    handlers?: HandlerMap<E>;       // optional initial event handlers
    autoConnect?: boolean;          // default: true
    serverErrorEvent?: string;      // default: "error"
  });

  connect(initialHandlers?: HandlerMap<E>): void;
  disconnect(): void;
  destroy(): void;

  isConnected(): boolean;

  on<K extends keyof E>(event: K, listener: (payload: E[K]) => void): () => void;
  off<K extends keyof E>(event: K, listener: (payload: E[K]) => void): void;

  emit<K extends keyof E>(
    event: K,
    payload: E[K],
    ack?: (response: unknown) => void
  ): void;
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

---

## 3. AIChatSocket

### Purpose
Builds on `SocketService<ChatEvents>` to provide a **focused chat API**:  
- Clean, callback-driven interface for AI + human chat events.
- Helper methods for common actions (`sendMessage`, `typingStart`, `abort`, `markRead`, etc).
- No need to manually bind event names — just provide callbacks.

### API
```ts
export class AIChatSocket {
  constructor(options: {
    url: string;
    chatId: string | number;
    joinEvent?: string;      // default: "chat:join"
    ioOptions?: SocketOptions;
    callbacks?: AIChatCallbacks;
    autoConnect?: boolean;   // default: true
    serverErrorEvent?: string;
  });

  setCallbacks(callbacks: Partial<AIChatCallbacks>): void;
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;

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

  markRead(params: {
    userId: string | number;
    messageIds: string[];
    readAt: string;
    traceId?: string;
  }): void;
}
```

### Callbacks
```ts
interface AIChatCallbacks {
  onConnect?: (info: { chatId: string | number }) => void;
  onDisconnect?: (info: { chatId: string | number }) => void;
  onServerError?: (error: unknown) => void;

  onChatMessage?: (event: ChatEvents["chat:message"]) => void;
  onPresenceUpdate?: (event: ChatEvents["presence:update"]) => void;

  onAIProcessing?: (event: ChatEvents["ai:processing"]) => void;
  onAIToken?: (event: ChatEvents["ai:token"]) => void;
  onAIMessage?: (event: ChatEvents["ai:message"]) => void;
  onAIError?: (event: ChatEvents["ai:error"]) => void;

  onAIToolCall?: (event: ChatEvents["ai:tool_call"]) => void;
  onAIToolResult?: (event: ChatEvents["ai:tool_result"]) => void;
}
```

### Usage Example
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

// Sending a message
chat.sendMessage({
  messageId: crypto.randomUUID(),
  userId: "user-123",
  text: "Hello AI!"
});

// Marking messages as read
chat.markRead({
  userId: "user-123",
  messageIds: ["msg-1", "msg-2"],
  readAt: new Date().toISOString()
});
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
- **AIChatSocket:** The **driver** — chat-specific client with callbacks + helpers.

Together, they give you a clean, strongly-typed, and extensible foundation for real-time AI chat apps.
