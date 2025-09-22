---
title: Playground
outline: deep
---

# Playground & Mock Server

We ship a small Vite app and a mock Socket.IO server so you can try the SDK end‑to‑end.

```bash
pnpm dev:all      # mock server (4000) + playground (5173)
pnpm mock:dev     # server only
pnpm playground:dev
```

`playground/.env`:

```ini
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```
