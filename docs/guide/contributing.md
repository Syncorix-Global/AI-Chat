---
title: Contributing
description: How to set up, develop, and propose changes
---

# Contributing

> This page mirrors the root **CONTRIBUTING.md** so it renders inside the docs site.

## Project Structure

- `src/`
  - `sockets/` → `ChatEvents.ts`, `SocketService.ts`, `AIChatSocket(s).ts`
  - `interactions/typingObserver/` → TypingObserver core
- `mock-server/` → Socket.IO mock backend for local testing
- `playground/` → Vite + React demo app consuming the library
- `docs/` → VitePress site

## Getting Started

```bash
pnpm i
pnpm dev:all     # runs mock-server (4000) + playground (5173)
```

## Source of Truth: Events

All client/server event shapes live in `ChatEvents.ts`. Keep backend and frontend in sync; update both sides when adding or changing events.

## Coding Guidelines

- **Type-first**: Prefer strict, exported types for public APIs.
- **Stable contracts**: `ChatEvents` is the contract; avoid breaking changes. If unavoidable, bump major and document migration.
- **Granular layers**:
  - Low-level: `SocketService` (strict control).
  - High-level: `AIChatSocket` (callbacks + helpers).
- **Docs**: Add or update related pages under `docs/` when you add features.

## Adding Events / Features

1. Update `src/sockets/ChatEvents.ts`.
2. Implement server handling in `mock-server/server.ts` if needed for testing.
3. Extend `SocketService` and/or `AIChatSocket` with typed handlers & helpers.
4. Update docs under `docs/socket/` or `docs/typing/`.

## Testing

- Unit tests live in `tests/` (vitest).
- For manual verification, use the **playground** against the **mock server**.

## Commit & PR

- Small, focused PRs.
- Include tests or playground steps to verify behavior.
- Update docs for public APIs.
