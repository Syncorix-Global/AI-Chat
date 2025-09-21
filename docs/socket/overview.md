---
title: Socket Overview
description: The typed socket stack at a glance
---

# Socket Overview

The socket layer is split into three parts:

1. **ChatEvents** — a single TypeScript interface that defines every client ⇄ server event and payload. Keep this shared on both sides.
2. **SocketService** — a generic, low-level, strongly typed Socket.IO client wrapper for full control (connect, emit, on, lifecycle).
3. **AIChatSocket** — a batteries-included high-level client with callbacks and helper methods (send, typing, abort, read receipts).

Use **AIChatSocket** for quick integration. Drop down to **SocketService** when you need advanced behavior or custom events.
