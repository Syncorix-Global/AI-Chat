---
title: Local Playground & Mock Server
description: Run the demo UI against a mock Socket.IO backend
---

# Local Playground & Mock Server

## Run

```bash
pnpm dev:all
```

- Playground UI: `http://localhost:5173`
- Mock server: `http://localhost:4000`

## Environment

Create `playground/.env`:

```ini
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

## What’s included

- **Mock server** in `mock-server/server.ts` to simulate the AI pipeline.
- **React + Vite** playground in `playground/`, which imports the library source for rapid iteration.

Use this to verify event contracts, token streaming, typing indicators, and error paths before plugging into your real backend.
