---
title: Testing with Vitest
outline: deep
---

# Testing with Vitest

We use **Vitest** for unit, integration, and DOM tests.

```bash
pnpm test         # run once (CI mode)
pnpm test:watch   # watch mode
```

- Config & scripts
- Unit tests: `Node`, `Path`
- Graph: `Conversation`
- Orchestration: `ChatSDK` (mock socket)
- Rebuilders: shape/transcript
- DOM: `TypingObserver` with jsdom

> See each code block for copy‑paste tests. Adjust imports or enable `vite-tsconfig-paths`.
