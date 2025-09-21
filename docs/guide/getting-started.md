---
title: Getting Started
description: Install, run, and configure your environment quickly
---

# Getting Started

## Install

```bash
pnpm i @syncorix/consultation
```

> In monorepo development, the playground imports from `../src/...` via Vite aliases.

## Run the playground + mock server

```bash
pnpm dev:all
```

- Playground UI: `http://localhost:5173`
- Mock server: `http://localhost:4000`

Create `playground/.env`:

```bash
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

## What’s inside

- **Socket Layer**: `src/sockets/…`
- **Typing**: `src/interactions/typingObserver/TypingObserver.ts`
- **Mock server**: `mock-server/server.ts` (simulates AI pipeline)
- **Playground**: `playground/` (React + Vite)
