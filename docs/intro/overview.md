---
title: Overview
outline: deep
---

# Syncorix AI Chat SDK

A **frontend-first**, type-safe toolkit for building **real‑time AI chat UIs**. It gives you:

- **Socket layer**: a typed Socket.IO client (`AIChatSocket`) that streams tokens, presence, and status.
- **Orchestration**: a small **Chat SDK** that wires your socket to a conversation graph and emits friendly UI events for your UI.
- **Typing UX**: an IME‑aware `TypingObserver` for focus/typing/pause/stop.
- **Data model**: `Conversation`, `Node`, and `Path` for rendering, persistence, and telemetry.
- **Rebuilders**: hydrate a conversation graph from a persisted transcript/shape.

> Works fully in the browser. Bring any Socket.IO backend that speaks your `ChatEvents` contract.
