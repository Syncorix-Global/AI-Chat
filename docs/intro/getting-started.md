---
title: Getting Started
outline: deep
---

# Getting Started

This quickstart gets you streaming an assistant message in **under 5 minutes**.

## Install

```bash
pnpm add @syncorix/ai-chat-sdk
# or npm i @syncorix/ai-chat-sdk
```

Requirements:
- Node **18+** for tooling.
- A Socket.IO backend that emits events matching your `ChatEvents` schema.

## Minimal integration

```ts
import { AIChatSocket, ChatSDK } from "@syncorix/ai-chat-sdk";

// 1) Socket client → your Socket.IO backend
const socket = new AIChatSocket({
  url: import.meta.env.VITE_SOCKET_URL, // e.g., http://localhost:4000
  chatId: "room-1",
  autoConnect: true,
});

// 2) High-level SDK that wires socket → conversation graph → UI events
const sdk = new ChatSDK({
  socket,
  chatId: "room-1",
  userId: "user-123",
  typing: { target: "#message", autoEmit: true }, // optional
});

// 3) React/Vue/Svelte/Vanilla — subscribe to SDK events and render
sdk.on("conversation:update", ({ conversation }) => {
  // render from conversation.nodes and conversation.paths
});

sdk.on("system:update", ({ message, options }) => {
  // assistant bubble; render streamed text and any quick-reply options[]
});

// 4) Send a message
sdk.sendText("Hello!");
```

### Add typing indicators only

```ts
import { TypingObserver, TypingObserverEvent } from "@syncorix/ai-chat-sdk/typing-observer";

const ob = new TypingObserver("#message", { pauseDelay: 700, stopDelay: 1500 });
ob.on(TypingObserverEvent.TypingStart, () => {/* ui start */});
ob.on(TypingObserverEvent.TypingPause, () => {/* ui pause */});
ob.on(TypingObserverEvent.TypingStop,  () => {/* ui stop  */});
```

### Persist & hydrate

```ts
import { rebuildConversationFromShape } from "@syncorix/ai-chat-sdk";

// later, from localStorage/db
const rows = JSON.parse(localStorage.getItem("shape") || "[]");
const conversation = rebuildConversationFromShape(rows);
```

That’s it. Next, learn the **layers** and how to extend the SDK.
