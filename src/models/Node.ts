// models/Node.ts

/**
 * Drop-in compatible Node with tiny convenience getters.
 * Original API preserved: constructor, setContent().
 */

export interface Content {
  message: string;
  options?: string[];
  timestamp?: number;
}

export enum NodeType {
  SYSTEM = "system",
  USER = "user",
}

export enum NodeStatus {
  NOT_STARTED = "notStarted",
  PROCESSING = "processing",
  READY = "ready",
  ERROR = "error",
}

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export class Node {
  /** Unique id for this node */
  readonly id = makeId();
  /** ms epoch when created */
  readonly createdAt = Date.now();

  type: NodeType;
  status: NodeStatus;
  content?: Content;

  // links are managed by Conversation; do not set manually
  previous?: Node;
  next?: Node;

  constructor(type: NodeType, status: NodeStatus = NodeStatus.NOT_STARTED) {
    this.type = type;
    this.status = status;
  }

  /** Set content and mark READY */
  setContent(message: string, options?: string[]) {
    this.content = { message, options, timestamp: Date.now() };
    this.status = NodeStatus.READY;
  }

  // ── Friendly helpers (NEW, optional to use) ───────────────────────────────
  isUser() { return this.type === NodeType.USER; }
  isSystem() { return this.type === NodeType.SYSTEM; }
  isError() { return this.status === NodeStatus.ERROR; }
  isReady() { return this.status === NodeStatus.READY; }
}
