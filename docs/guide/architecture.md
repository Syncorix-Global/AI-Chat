---
title: Architecture
outline: deep
---

# Architecture

The SDK is made of **small, composable layers**:

```
┌──────────────── UI (your app) ────────────────┐
│  subscribe to SDK events, render bubbles       │
└──────────────▲────────────────────────────────┘
               │
        Chat SDK (orchestrator)  ← requestId correlation, status mapping,
               │                    prompt/moderation (frontend-controlled)
               ▼
     AIChatSocket (typed Socket.IO client)
               │
               ▼
      Socket.IO Backend (your server) ⇄ Tools/Model
               │
               ▼
     Conversation / Node / Path (graph + telemetry)
               │
               ▼
          TypingObserver (IME-aware UX)
```

**Key ideas**

- **Event-first UI**: the SDK emits `conversation:update`, `status:change`, `ai:token`, `system:update`, `typing`, `error`.
- **requestId correlation**: when sending, the SDK includes a `requestId` so tokens/final messages map to the right pair.
- **Status mapping**: map server statuses (`queued/working/retrying`) to a stable UI status set (`queued/running/done/error`).
- **Graph model**: `Conversation` tracks `Node`s (USER or SYSTEM) and `Path`s (links with process/steps). Perfect for rendering and metrics.
