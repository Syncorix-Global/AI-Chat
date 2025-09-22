// graph/conversation.ts

/**
 * Drop-in compatible Conversation with clearer docs and helper methods.
 * Original API preserved: system(), user(), beginAssistantWork(), resolveAssistant(), failAssistant().
 */

import { Node, NodeType, NodeStatus } from "@models/Node";
import { Path } from "@models/Path";

export type Pair = { user: Node; system: Node; path: Path };

export class Conversation {
  /** First node in the chain */
  head?: Node;
  /** Most recent node in the chain */
  tail?: Node;

  /** Full linear history of nodes */
  readonly nodes: Node[] = [];
  /** One path per USER→SYSTEM link (plus system-link between system/system inserts) */
  readonly paths: Path[] = [];

  /** Optional convenience index (id → node) */
  readonly byId = new Map<string, Node>();

  // ── internal helpers ──────────────────────────────────────────────────────
  private track(n: Node) {
    this.nodes.push(n);
    this.byId.set(n.id, n);
  }

  /**
   * Link node a → node b and create a Path for that link.
   * We start() the path so it is immediately 'queued' with startedAt set.
   */
  private link(a: Node, b: Node, pathLabel?: string) {
    a.next = b;
    b.previous = a;

    const p = new Path(a.id, b.id, pathLabel).start();
    this.paths.push(p);
    return p;
  }

  // ── Original API (unchanged) ──────────────────────────────────────────────

  /**
   * Append a SYSTEM node (no paired USER required).
   * If there was a tail, we link tail → system via a 'system-link' path.
   */
  system(message?: string) {
    const sys = new Node(NodeType.SYSTEM, NodeStatus.NOT_STARTED);
    if (!this.head) this.head = sys;
    if (this.tail) this.link(this.tail, sys, "system-link");
    this.tail = sys;
    if (message) sys.setContent(message);
    this.track(sys);
    return sys;
  }

  /**
   * Append a USER node and automatically pair it with a SYSTEM node + Path.
   * Returns both nodes and the Path for convenience.
   */
  user(message: string, options?: string[]): Pair {
    // USER node (immediately contains content)
    const user = new Node(NodeType.USER, NodeStatus.PROCESSING);
    user.setContent(message, options);

    if (!this.head) this.head = user;
    if (this.tail) this.link(this.tail, user, "user-link");
    this.tail = user;
    this.track(user);

    // Paired SYSTEM node (placeholder reply)
    const system = new Node(NodeType.SYSTEM, NodeStatus.NOT_STARTED);
    const path = this.link(user, system, "assistant-reply"); // queued
    this.tail = system;
    this.track(system);

    return { user, system, path };
  }

  /** Mark assistant work starting on the pair’s path. */
  beginAssistantWork(pair: Pair, stepInfo?: Record<string, any>) {
    // neutral, generic step label:
    pair.path.step("work:begin", stepInfo);
  }

  /** Set the reply content on the paired SYSTEM node and mark the path done. */
  resolveAssistant(pair: Pair, reply: string, info?: Record<string, any>) {
    pair.system.setContent(reply);
    if (info) pair.path.endStep(true, info);
    pair.path.done();
  }

  /** Mark the SYSTEM node as error and the path as error. */
  failAssistant(pair: Pair, errorInfo?: Record<string, any>) {
    pair.system.status = NodeStatus.ERROR;
    if (!pair.system.content) {
      pair.system.setContent("An error occurred.");
      pair.system.status = NodeStatus.ERROR;
    }
    pair.path.error(errorInfo);
  }

  // ── Friendly helpers (NEW, optional to use) ───────────────────────────────

  /** Returns the last Pair (USER→SYSTEM) if available */
  lastPair(): Pair | undefined {
    const p = this.paths.length ? this.paths[this.paths.length - 1] : undefined;
    if (!p || !p.fromId || !p.toId) return undefined;
    const user = this.byId.get(p.fromId);
    const system = this.byId.get(p.toId);
    if (!user || !system) return undefined;
    // We trust user() created these in order (USER then SYSTEM)
    return { user, system, path: p };
  }

  /** Quick one-liner: create a pair and immediately set a reply (no steps). */
  userQuick(message: string, reply: string, options?: string[]) {
    const pair = this.user(message, options);
    this.resolveAssistant(pair, reply);
    return pair;
  }

  /**
   * Convenience: create a pair and run a function as the work.
   * - Automatically calls beginAssistantWork()
   * - If fn resolves with a string, it becomes the reply
   * - If fn resolves with { reply, info? }, reply is used and info is appended to the path step
   */
  async userAsync<T extends string | { reply: string; info?: Record<string, any> }>(
    message: string,
    fn: (pair: Pair) => Promise<T> | T,
    options?: string[],
  ) {
    const pair = this.user(message, options);
    this.beginAssistantWork(pair);
    try {
      const out = await fn(pair);
      if (typeof out === "string") {
        this.resolveAssistant(pair, out);
      } else {
        this.resolveAssistant(pair, out.reply, out.info);
      }
      return pair;
    } catch (err: any) {
      this.failAssistant(pair, { error: String(err?.message ?? err) });
      return pair;
    }
  }

  /** Returns the last node (same as tail) */
  lastNode() { return this.tail; }

  /** Iterate nodes in order (handy for rendering) */
  *chain() {
    let n = this.head;
    while (n) {
      yield n;
      n = n.next;
    }
  }
}
