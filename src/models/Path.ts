// models/Path.ts

/**
 * Drop-in compatible Path with small quality-of-life helpers.
 * Original API preserved: start(), running(), step(), endStep(), done(), error().
 */

export type ProcessStatus = "notStarted" | "queued" | "running" | "done" | "error";

export interface ProcessStep {
  /** Human-readable label for the operation (e.g., "fetch:api") */
  name: string;
  /** ms epoch when the step started */
  startedAt: number;
  /** ms epoch when the step ended (set by endStep / done / error) */
  endedAt?: number;
  /** whether the step succeeded */
  ok?: boolean;
  /** arbitrary structured data for debugging/telemetry */
  info?: Record<string, any>;
}

export interface PathProcess {
  /** Optional tag for the whole path (e.g., "assistant-reply") */
  label?: string;
  status: ProcessStatus;
  startedAt?: number;
  endedAt?: number;
  steps: ProcessStep[];
}

/** Generates a stable-ish unique ID (works in browser + Node) */
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const now = () => Date.now();
const last = <T,>(arr: T[]): T | undefined => (arr.length ? arr[arr.length - 1] : undefined);

export class Path {
  /** Unique id for this path (not the same as node ids) */
  readonly id = makeId();
  /** ms epoch when this path instance was created */
  readonly createdAt = now();

  /**
   * We keep only IDs of nodes to avoid circular references and make
   * serialization trivial.
   */
  fromId?: string;
  toId?: string;

  /** Lifecycle & step telemetry for this path */
  process: PathProcess = { status: "notStarted", steps: [] };

  constructor(fromId?: string, toId?: string, label?: string) {
    this.fromId = fromId;
    this.toId = toId;
    if (label) this.process.label = label;
  }

  // ── Internal guards ────────────────────────────────────────────────────────
  private ensureQueued() {
    if (this.process.status === "notStarted") {
      this.process.status = "queued";
      this.process.startedAt = now();
    }
  }
  private ensureRunning() {
    if (this.process.status === "notStarted") this.ensureQueued();
    if (this.process.status === "queued") {
      this.process.status = "running";
      this.process.startedAt ??= now();
    }
  }
  private closeOpenStep(ok?: boolean, extra?: Record<string, any>) {
    const s = last(this.process.steps);
    if (!s || s.endedAt) return;
    s.endedAt = now();
    if (ok !== undefined) s.ok = ok;
    if (extra) s.info = { ...(s.info ?? {}), ...extra };
  }

  // ── Original API (unchanged) ───────────────────────────────────────────────
  /** notStarted → queued (sets startedAt) */
  start() {
    this.ensureQueued();
    return this;
  }

  /** queued → running (idempotent) */
  running() {
    this.ensureRunning();
    return this;
  }

  /** Add a new step (auto-ensures running; auto-closes any previous open step) */
  step(name: string, info?: Record<string, any>) {
    this.ensureRunning();
    this.closeOpenStep(undefined);
    this.process.steps.push({ name, startedAt: now(), info });
    return this;
  }

  /** Close the current open step and mark success/failure */
  endStep(ok = true, extra?: Record<string, any>) {
    this.closeOpenStep(ok, extra);
    return this;
  }

  /** Mark the whole path done and close any open step as ok=true */
  done() {
    this.process.status = "done";
    this.process.endedAt = now();
    this.closeOpenStep(true);
    return this;
  }

  /** Mark the whole path error; closes any open step; optionally log an 'error' step */
  error(info?: Record<string, any>) {
    this.process.status = "error";
    this.process.endedAt = now();
    this.closeOpenStep(false);
    if (info) this.step("error", info).endStep(false);
    return this;
  }

  // ── Friendly helpers (NEW, optional to use) ───────────────────────────────
  /** True if process.status === "running" */
  isRunning() { return this.process.status === "running"; }
  /** True if process.status === "done" */
  isDone() { return this.process.status === "done"; }
  /** True if process.status === "error" */
  hasError() { return this.process.status === "error"; }

  /** Total elapsed ms for the path (uses now() if not finished) */
  totalMs() {
    const start = this.process.startedAt ?? now();
    const end = this.process.endedAt ?? now();
    return Math.max(0, end - start);
  }

  /** Convenience: runs a function as a named step and auto endStep(true/false) */
  async withStep<T>(name: string, fn: () => Promise<T> | T, info?: Record<string, any>) {
    this.step(name, info);
    try {
      const result = await fn();
      this.endStep(true);
      return result;
    } catch (err: any) {
      this.endStep(false, { error: String(err?.message ?? err) });
      throw err;
    }
  }
}
