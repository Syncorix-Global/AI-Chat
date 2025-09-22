---
title: Socket Overview
outline: deep
---

# Socket Overview

Use `AIChatSocket` for a **typed** Socket.IO client with callbacks for:

- `chat:message`, `presence:update`
- `ai:processing`, `ai:token`, `ai:message`, `ai:error`
- `ai:tool_call`, `ai:tool_result` (optional)

Most apps won’t use it directly—prefer the **Chat SDK** which wires it to the graph and normalizes events.
