---
title: SocketService (base)
outline: deep
---

# SocketService (base)

A light wrapper around `socket.io-client` that adds typing and convenience:

- `on(event, listener)` / `off(event, listener)`
- `emit(event, payload, ack?)`
- `connect()` / `disconnect()`
- `isConnected()`
- automatic room join: emit `{ chatId }` on `joinEvent` (default `"chat:join"`)
- (new) optional wildcard subscription via the higher-level `AIChatSocket.onAny()`

Most apps don’t need this directly—use `AIChatSocket` or the **Chat SDK**.
