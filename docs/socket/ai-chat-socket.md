---
title: AIChatSocket (high-level)
description: Batteries-included chat client with callbacks & helpers
---

# AIChatSocket (high-level)

`AIChatSocket` is built on `SocketService<ChatEvents>` and provides a **clean callback API** plus helpers for common chat actions.

## Import & Connect

```ts
import { AIChatSocket } from "@sockets/AIChatSockets"; // or AIChatSocket if singular
import type { ChatID, UserID } from "@sockets/ChatEvents";

const chat = new AIChatSocket({
  url: import.meta.env.VITE_SOCKET_URL as string,
  chatId: import.meta.env.VITE_CHAT_ID as ChatID,
  ioOptions: { transports: ["websocket"] }, // pass auth here if needed
  callbacks: {
    onConnect: () => console.log("connected"),
    onDisconnect: () => console.log("disconnected"),
    onPresenceUpdate: (e) => console.log("online:", e.onlineUserIds),
    onAIProcessing: (e) => console.log("status:", e.status),
    onAIToken: (e) => console.log("token:", e.token),
    onAIMessage: (e) => console.log("assistant:", e.text),
    onAIError: (e) => console.error("ai error:", e.message),
    onChatMessage: (e) => console.log("user:", e.text)
  },
  autoConnect: true
});
```

## Send, Typing, Abort, Read

```ts
// send user text
chat.sendMessage({
  messageId: crypto.randomUUID(),
  userId: "user-1",
  text: "Hello!"
});

// typing indicators
chat.typingStart("user-1");
chat.typingStop("user-1");

// abort current AI response
chat.abort("user canceled");

// read receipts
chat.markRead({
  userId: "user-1",
  messageIds: ["m1", "m2"],
  readAt: new Date().toISOString()
});
```

## Callback Types

```ts
interface AIChatCallbacks {
  onConnect?(info: { chatId: ChatID }): void;
  onDisconnect?(info: { chatId: ChatID }): void;
  onServerError?(error: unknown): void;

  onChatMessage?(e: ChatEvents["chat:message"]): void;
  onPresenceUpdate?(e: ChatEvents["presence:update"]): void;

  onAIProcessing?(e: ChatEvents["ai:processing"]): void;
  onAIToken?(e: ChatEvents["ai:token"]): void;
  onAIMessage?(e: ChatEvents["ai:message"]): void;
  onAIError?(e: ChatEvents["ai:error"]): void;

  onAIToolCall?(e: ChatEvents["ai:tool_call"]): void;
  onAIToolResult?(e: ChatEvents["ai:tool_result"]): void;
}
```

> Prefer `AIChatSocket` when you want production-ready defaults and a straightforward callback story with minimal boilerplate.
