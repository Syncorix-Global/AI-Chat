---
title: Chat Events (contract)
outline: deep
---

# Chat Events (contract)

Your backend can emit the defaults below **or** advertise/rename them via mapping or discovery. The TypeScript payload types live in your project as `ChatEvents`.

**Server → Client** (default names)

- `chat:message` → `{ chatId, messageId, userId, text, createdAt }`
- `ai:processing` → `{ chatId, status: "queued"|"working"|"retrying", etaMs?, reason?, requestId? }`
- `ai:token` → `{ chatId, token, index, done?: false, requestId? }`
- `ai:message` → `{ chatId, messageId, role:"assistant", text, createdAt, usage?, options?, requestId? }`
- `ai:error` → `{ chatId, code?, message, details?, requestId? }`
- `presence:update` → `{ chatId, onlineUserIds: Array<string|number> }`

**Client → Server** (default names)

- `user:message` → `{ chatId, messageId, userId, text, parts?, requestId? }`
- `user:typingStart` / `user:typingStop` → `{ chatId, userId }`
- `ai:abort` → `{ chatId, reason? }`
- `chat:read` → `{ chatId, userId, messageIds, readAt }`

> **requestId** is critical for correlating a user turn to the token/final events.

**Remapping**: If your server uses e.g. `llm:final` for `ai:message`, set `eventNames: { AI_MESSAGE: "llm:final" }` or provide an `eventResolver`.
