/*
 * ChatEvents.ts
 * ------------------------------------------------------------
 * Typed event map for AI chat + human chat, covering:
 * - client -> server: send message, typing start/stop, abort
 * - server -> client: ai processing status, token stream, final message, errors, tool calls
 * - common: presence, read receipts, plain chat messages
 */

export type ChatID = string | number;
export type UserID = string | number;

export interface BaseMeta {
  chatId: ChatID;
  traceId?: string;     // optional tracing ID for correlating events
  requestId?: string;   // optional per-message/request correlation
}

/** All events are strongly typed here. */
export interface ChatEvents {
  /* -------------------- Client -> Server -------------------- */

  /** Client requests to send a user message to the model. */
  "user:message": BaseMeta & {
    messageId: string;
    userId: UserID;
    text: string;
    // optional structured parts (e.g., attachments, tool hints)
    parts?: Array<{ type: "text" | "image" | "file"; value: unknown }>;
  };

  /** Client user started typing. */
  "user:typingStart": BaseMeta & { userId: UserID };

  /** Client user stopped typing. */
  "user:typingStop": BaseMeta & { userId: UserID };

  /** Client requests the server to abort the current AI response. */
  "ai:abort": BaseMeta & { reason?: string };

  /** Client acknowledges messages as read. */
  "chat:read": BaseMeta & { userId: UserID; messageIds: string[]; readAt: string };

  /* -------------------- Server -> Client -------------------- */

  /** Human chat message (broadcast from server). */
  "chat:message": BaseMeta & {
    messageId: string;
    userId: UserID;
    text: string;
    createdAt: string; // ISO
  };

  /** Server signals AI is processing a request. */
  "ai:processing": BaseMeta & {
    status: "queued" | "working" | "retrying";
    etaMs?: number;
    reason?: string; // for retrying/backoff
  };

  /** AI token stream (partial text). */
  "ai:token": BaseMeta & {
    token: string;
    index: number;     // token index in this stream
    done?: false;
  };

  /** AI finished a message. */
  "ai:message": BaseMeta & {
    messageId: string;
    role: "assistant";
    text: string;
    createdAt: string; // ISO
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  };

  /** AI/tool error surfaced to the client. */
  "ai:error": BaseMeta & { code?: string; message: string; details?: unknown };

  /** AI requests a tool call with arguments. */
  "ai:tool_call": BaseMeta & {
    callId: string;
    toolName: string;
    args: unknown;
  };

  /** Server returns tool result back into the flow. */
  "ai:tool_result": BaseMeta & {
    callId: string;
    toolName: string;
    result: unknown;
  };

  /** Presence updates for the room. */
  "presence:update": BaseMeta & { onlineUserIds: UserID[] };
}
