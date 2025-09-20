---
title: SocketService (base)
description: A typed, low-level Socket.IO wrapper for full control
---

# SocketService (base)

`SocketService<TEvents>` is a generic, typed wrapper over Socket.IO that gives you **full control** over connect/emit/listen with compile-time safety.

## Import

```ts
import { SocketService } from "@sockets/SocketService";
import type { ChatEvents } from "@sockets/ChatEvents";
```

## Constructor

```ts
const service = new SocketService<ChatEvents>({
  url: "https://realtime.example.com",
  chatId: "room-1",
  joinEvent: "chat:join",        // default
  ioOptions: { transports: ["websocket"], auth: { token: "JWT" } },
  handlers: {
    "ai:message": (e) => console.log(e.text)
  },
  autoConnect: true,             // default true
  serverErrorEvent: "error"      // default
});
```

## Methods

```ts
service.connect(optionalHandlers?);
service.disconnect();
service.destroy();
service.isConnected(); // boolean

// typed listeners
const off = service.on("ai:message", (payload) => { /* … */ });
off(); // unsubscribe

// typed emit
service.emit("user:message", {
  chatId: "room-1",
  messageId: "u1",
  userId: "user-123",
  text: "Hello!"
});
```

> Use `SocketService` when you need to compose custom flows, manage lifecycles manually, or add bespoke events beyond the high-level client.
