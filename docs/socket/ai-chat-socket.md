---
title: AIChatSocket
outline: deep
---

# AIChatSocket (high-level)

A typed client that maps Socket.IO to **callbacks**:

```ts
const chat = new AIChatSocket({
  url: "http://localhost:4000",
  chatId: "room-1",
  callbacks: {
    onAIProcessing: (e) => {/* status */},
    onAIToken:      (e) => {/* stream */},
    onAIMessage:    (e) => {/* final */},
    onAIError:      (e) => {/* error */},
  },
});
```

### Client → Server helpers

- `sendMessage({ messageId, userId, text, parts?, requestId? })`
- `typingStart(userId)` / `typingStop(userId)`
- `abort(reason?)`
- `markRead({ userId, messageIds, readAt })`

Prefer using this through the **Chat SDK** which handles the conversation graph, correlation, and UI events.

## Dynamic topics (new)

Remap the default names to match your backend without changing server code:

```ts
const chat = new AIChatSocket({
  url: "http://localhost:4000",
  chatId: "room-1",
  eventNames: {
    JOIN: "room:enter",
    USER_MESSAGE: "chat/user_message",
    AI_TOKEN: "llm:delta",
    AI_MESSAGE: "llm:final",
  },
  // Or compute:
  // eventResolver: (key, def) => tenantMap[key] ?? def,
});
```

**Extras**
- `onAny((event, ...args) => void)` — observe all topics (debug/telemetry)
- `emitRaw(name, payload)` / `onRaw(name, cb)` / `offRaw(name, cb)` — escape hatches
- Discovery (optional): `discoverEvents`, `discoveryRequestEvent`, `discoveryResponseEvent`
