---
title: Chat Events (contract)
description: The single source of truth for all client ⇄ server events
---

# Chat Events (contract)

`ChatEvents.ts` is the **typed source of truth** for every event and payload shape. Keep it shared across client and server to avoid drift.

## Types

```ts
export type ChatID = string;
export type UserID = string | number;
```

## Client → Server

```ts
"chat:join": { chatId: ChatID; userId?: UserID };
"user:message": { chatId: ChatID; messageId: string; userId: UserID; text: string };
"user:typingStart": { chatId: ChatID; userId: UserID; traceId?: string };
"user:typingStop": { chatId: ChatID; userId: UserID; traceId?: string };
"ai:abort": { chatId: ChatID; reason?: string };
"chat:read": { chatId: ChatID; userId: UserID; messageIds: string[]; readAt: string };
```

## Server → Client

```ts
"presence:update": { chatId: ChatID; onlineUserIds: UserID[] };
"chat:message": { chatId: ChatID; messageId: string; userId: UserID; text: string; createdAt: string };
"ai:processing": { chatId: ChatID; status: "queued" | "working" | "retrying"; etaMs?: number };
"ai:token": { chatId: ChatID; token: string; index: number; done?: false };
"ai:message": { chatId: ChatID; messageId: string; role: "assistant"; text: string; createdAt: string };
"ai:error": { chatId: ChatID; code?: string; message: string; details?: unknown };

// optional: tools
"ai:tool_call": { chatId: ChatID; callId: string; toolName: string; args: unknown };
"ai:tool_result": { chatId: ChatID; callId: string; toolName: string; result: unknown };
```

> Treat this file as the contract. When you add or change an event, update both backend and frontend together.
