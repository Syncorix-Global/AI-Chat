---
title: Chat Events (contract)
outline: deep
---

# Chat Events (contract)

Your backend should emit these (or a superset). The TypeScript types live in your project as `ChatEvents`.

**Server → Client**

- `chat:message` → `{ chatId, messageId, userId, text, createdAt }`
- `ai:processing` → `{ chatId, status: "queued"|"working"|"retrying", etaMs?, reason?, requestId? }`
- `ai:token` → `{ chatId, token, index, done?: false, requestId? }`
- `ai:message` → `{ chatId, messageId, role:"assistant", text, createdAt, usage?, options?, requestId? }`
- `ai:error` → `{ chatId, code?, message, details?, requestId? }`
- `presence:update` → `{ chatId, onlineUserIds: Array<string|number> }`

**Client → Server**

- `user:message` → `{ chatId, messageId, userId, text, parts?, requestId? }`
- `user:typingStart` / `user:typingStop` → `{ chatId, userId }`
- `ai:abort` → `{ chatId, reason? }`
- `chat:read` → `{ chatId, userId, messageIds, readAt }`

> **requestId** is critical for correlating a user turn to the token/final events.
