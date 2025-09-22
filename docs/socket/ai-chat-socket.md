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
