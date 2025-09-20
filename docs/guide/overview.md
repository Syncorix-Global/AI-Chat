---
title: Overview
description: What this package provides and how it fits together
---

# Overview

**Syncorix Consultation** is a small, typed client for real-time chat and input UX.

- **Socket Layer**
  - `ChatEvents.ts`: the shared event contract
  - `SocketService.ts`: a generic typed Socket.IO wrapper
  - `AIChatSocket.ts`: a high-level chat client with callbacks & helpers
- **Typing**
  - `TypingObserver.ts`: focus + typing state detection with IME support
- **Playground**
  - Vite + React demo UI
  - Mock Socket.IO server for local development
