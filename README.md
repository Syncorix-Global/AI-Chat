# Syncorix Consultation

Typed realtime chat + typing UX for AI chat applications.  
This package provides a **Socket.IO client wrapper** and **typing observer** with strong TypeScript contracts, plus a playground and mock server for development.

---

## ✨ Features

- **Typed Socket Layer**
  - `ChatEvents` → single source of truth for events
  - `SocketService` → low-level Socket.IO wrapper with full typing
  - `AIChatSocket` → high-level client with callbacks & helpers
- **Typing Layer**
  - `TypingObserver` → focus + typing detection (with IME support)
- **Playground**
  - React + Vite demo UI
  - Mock Socket.IO server simulating AI lifecycle events

---

## 📦 Installation

```bash
pnpm i @syncorix/consultation
```

---

## 🚀 Quickstart (Integrator Guide)

### 1. Connect to a Chat

```ts
import { AIChatSocket } from "@sockets/AIChatSockets";
import type { ChatID } from "@sockets/ChatEvents";

const chat = new AIChatSocket({
  url: "https://realtime.example.com",
  chatId: "room-1" as ChatID,
  ioOptions: { transports: ["websocket"], auth: { token: "JWT" } },
  callbacks: {
    onConnect: () => console.log("connected"),
    onAIMessage: (e) => console.log("assistant:", e.text),
    onChatMessage: (e) => console.log("user:", e.text),
    onAIError: (e) => console.error("ai error:", e.message)
  }
});
```

### 2. Send a Message

```ts
chat.sendMessage({
  messageId: crypto.randomUUID(),
  userId: "user-1",
  text: "Hello!"
});
```

### 3. Typing Indicators

```ts
chat.typingStart("user-1");
chat.typingStop("user-1");
```

### 4. Abort or Mark Read

```ts
chat.abort("user canceled");

chat.markRead({
  userId: "user-1",
  messageIds: ["m1", "m2"],
  readAt: new Date().toISOString()
});
```

---

## 🧩 Typing Observer

Detect when a user is typing, pausing, or stopping.

```ts
import { observeTyping, TypingObserverEvent } from "@syncorix/consultation/typing";

const ob = observeTyping("#message", { pauseDelay: 700, stopDelay: 1400 });

ob.on(TypingObserverEvent.TypingStart, () => console.log("start"));
ob.on(TypingObserverEvent.Typing, (e) => console.log("value=", e.value));
ob.on(TypingObserverEvent.TypingPause, () => console.log("pause"));
ob.on(TypingObserverEvent.TypingStop, () => console.log("stop"));
```

---

## 🎨 Playground & Mock Server

Run a local mock server and playground UI for testing.

```bash
pnpm dev:all
```

- Playground → [http://localhost:5173](http://localhost:5173)
- Mock server → [http://localhost:4000](http://localhost:4000)

Configure `playground/.env`:

```ini
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full details.

### Highlights

- **Type-first** → All events defined in `ChatEvents.ts` (update both client & server).
- **Granular layers** → Low-level (`SocketService`), high-level (`AIChatSocket`).
- **Docs** → Keep `docs/` updated when adding features.

---

## 📄 License

MIT
