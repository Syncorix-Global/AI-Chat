---
title: End‑to‑End Example
outline: deep
---

# End‑to‑End Example (Frontend‑only)

This page walks through a **complete, frontend‑only** wiring that uses the same building blocks as the SDK:
- a typed Socket client (`AIChatSocket`),
- a conversation graph (`Conversation`, `Node`, `Path`),
- typing UX (`TypingObserver`),
- prompt composition & moderation,
- hydration from a persisted shape.

> The code below is **your original implementation** (kept intact). We break it into sections and explain exactly what each part does and how it fits together. Keep your path aliases (e.g. `@sockets/*`, `@models`, `@interactions/*`) as you have them in your app.

> **Update (socket flow)**  
> You can now pass **arbitrary connect params** via `ioOptions.query`/`ioOptions.auth`, skip rooms with `joinEvent: null`, and stamp `meta` into every client→server emit. The rest of this page remains valid; only your **socket initialization** may change if your backend needs these.

---

## 0) Imports & Example Types

```ts
/* eslint-disable no-console */
import { AIChatSocket } from  "@sockets/AIChatSockets";
import type { ChatID, UserID } from "@/sockets/ChatEvents";
import { Conversation } from "@models";
import { TypingObserver, TypingObserverEvent } from "@interactions/typingObserver"
```

**What these are:**
- `AIChatSocket` — your typed Socket.IO client that raises callbacks for `ai:processing`, `ai:token`, `ai:message`, etc.
- `ChatID`, `UserID` — utility types for strong typing.
- `Conversation` — your graph model tracking nodes (USER, SYSTEM) and links (`Path`), perfect for rendering & timeline/telemetry.
- `TypingObserver` — IME-aware typing/focus lifecycle for inputs/textareas/contenteditable.

### Helper types used in this file

```ts
type SDKStatus = "queued" | "running" | "done" | "error";
type StatusMapper = (serverStatus: any) => SDKStatus;

type PromptPart =
  | { kind: "system"; text: string }
  | { kind: "guard";  text: string }
  | { kind: "user";   text: string };

type Decision =
  | { action: "allow";  text: string }
  | { action: "modify"; text: string; reason?: string }
  | { action: "block";  text: string; reason?: string };

type Msg = { message: string; options?: string[]; timestamp?: number };
type Row = { user?: Msg; system?: Msg; status?: "queued"|"running"|"done"|"error" };
```

- `SDKStatus` is your **UI‑friendly** status set. We’ll map server statuses into this using a **StatusMapper**.
- `PromptPart` lets you compose a final prompt from `system`, `guard`, and `user` parts.
- `Decision` is the result of a **moderation pipeline** (allow/modify/block).
- `Row` is the **persisted shape** you store and later hydrate back into a `Conversation`.

---

## 1) UI Event Bus (optional but useful)

```ts
type UIEvents =
  | { type: "conversation:update" }
  | { type: "status:change"; pathId: string; from: SDKStatus; to: SDKStatus; meta?: any }
  | { type: "ai:token"; token: string; index: number; cumulative: string }
  | { type: "ai:message"; text: string }
  | { type: "system:update"; message: string; options?: string[] }
  | { type: "typing"; kind: "start" | "pause" | "stop" | "tick" }
  | { type: "error"; error: unknown };

function makeEmitter() {
  const handlers = new Set<(evt: UIEvents) => void>();
  return {
    on(fn: (evt: UIEvents) => void) { handlers.add(fn); return () => handlers.delete(fn); },
    emit(evt: UIEvents) { for (const fn of [...handlers]) fn(evt); }
  };
}
```

**Why use this?** It decouples your **data layer** from your **UI**. You can plug this emitter into React, Vue, or vanilla to re-render whenever the conversation updates, tokens arrive, or status changes.

---

## 2) Prompt Composer & Moderation

```ts
function composePrompt(parts: PromptPart[]) {
  const system = parts.filter(p => p.kind === "system").map(p => p.text).join("\n");
  const guards = parts.filter(p => p.kind === "guard").map(p => p.text).join("\n");
  const user   = parts.find(p => p.kind === "user")?.text ?? "";

  const composed = [system, guards, user].filter(Boolean).join("\n\n");

  // Pass structure to server if you want it to see context explicitly
  const structuredParts = [
    system && { type: "text", value: { role: "system", text: system } },
    guards && { type: "text", value: { role: "guard",  text: guards } },
  ].filter(Boolean) as Array<{ type: "text"; value: { role: string; text: string } }>;

  return { composed, structuredParts };
}
```

- **What it does**: convert `[system, guard, user]` pieces into a final string while also preparing a **structured** list the server can log or send to tools.
- **Why it’s valuable**: you keep **frontend control** over prompts and privacy filtering.

```ts
const moderationPipeline = [
  (t: string): Decision => t.length > 4000 ? ({ action: "block", text: t, reason: "too_long" })
                                           : ({ action: "allow", text: t }),
  (t: string): Decision => /forbidden/i.test(t) ? ({ action: "modify", text: t.replace(/forbidden/ig, "******") })
                                                : ({ action: "allow", text: t }),
];
async function moderate(text: string): Promise<Decision> {
  let cur = text;
  for (const step of moderationPipeline) {
    const res = await Promise.resolve(step(cur));
    if (res.action === "block") return res;
    if (res.action === "modify") cur = res.text;
  }
  return { action: "allow", text: cur };
}
```

- **How it works**: a simple, synchronous pipeline that can **block** or **modify** the prompt before sending.
- **Extend it**: call 3rd‑party moderation APIs, rate limits, A/B template versions—**before** you emit to the server.

---

## 3) Rebuild from a Persisted Shape

```ts
function rebuildConversationFromShape(rows: Row[]): Conversation {
  const convo = new Conversation();
  rows.forEach((row, i) => {
    const hasU = !!row.user?.message; const hasS = !!row.system?.message;

    if (hasU && hasS) { /* user+system */ ... return; }
    if (hasU) { /* user only */ ... return; }
    if (hasS) { /* system only */ ... }
  });
  return convo;
}
```

This helper converts a **flat list** of `{ user?, system?, status? }` rows into a fully linked `Conversation`:

- **user + system** → create a full pair, mark the path **done**, stamp timestamps, and push a `"rebuild"` step.
- **user only** → create a pair with a placeholder system and set the path status from `row.status`.
- **system only** → append a standalone system node and finalize the last path as done.

Why? So you can **persist and hydrate** chats without storing the entire graph.

> The full code is in the next section; we abbreviated here for clarity.

---

## 4) The Example App — `initChatDemo`

This function wires **everything** together and returns a small **SDK‑like surface** for your UI.

```ts
export function initChatDemo(opts: {
  socketUrl: string;
  chatId: ChatID;
  userId: UserID;
  inputSelector: string;                    // e.g. "#message"
  statusMapper?: StatusMapper;              // map server statuses → UI statuses
  onUIEvent?: (evt: UIEvents) => void;      // observe everything from this demo
  hydrate?: Row[];                          // optional persisted rows to rebuild from
}) { /* ... */ }
```

### 4.1 Status mapping

```ts
const mapStatus: StatusMapper = opts.statusMapper ?? ((s) => {
  const v = String(s ?? "").toLowerCase();
  if (v === "queued") return "queued";
  if (v === "working" || v === "retrying" || v === "running") return "running";
  if (v === "done")    return "done";
  if (v === "error" || v === "failed") return "error";
  return "running";
});
```

Servers often have richer states (`retrying`, backoff, etc.). This makes it **stable for UI**.

### 4.2 Graph state & hydration

```ts
let convo = new Conversation();
if (opts.hydrate?.length) {
  convo = rebuildConversationFromShape(opts.hydrate);
  ui.emit({ type: "conversation:update" });
}
```

If you pass `hydrate`, we rebuild first—**no server call required**—and render the existing history.

### 4.3 Correlation by `requestId`

```ts
const byRequestId = new Map<string, ReturnType<Conversation["user"]>>();
let lastPair: ReturnType<Conversation["user"]> | null = null;
```

We **must** correlate incoming server events (tokens/final) with the right user turn. We send `requestId = pair.path.id` and keep a map to find the exact pair when events arrive.

### 4.4 Socket wiring (callbacks)

```ts
const chat = new AIChatSocket({
  url: opts.socketUrl,
  chatId: opts.chatId,
  autoConnect: true,
  callbacks: {
    onConnect:     () => ui.emit({ type: "conversation:update" }),
    onDisconnect:  () => ui.emit({ type: "conversation:update" }),

    onChatMessage: (e) => {
      const sys = convo.system(e.text);
      if (sys.content && e.createdAt) sys.content.timestamp = Date.parse(e.createdAt);
      ui.emit({ type: "system:update", message: sys.content?.message ?? ''});
      ui.emit({ type: "conversation:update" });
    },
```

- **onChatMessage**: human messages from the server become `SYSTEM` nodes (e.g., broadcast). Adjust as you like.

```ts
    onAIProcessing: (e) => {
      const pair = (e.requestId && byRequestId.get(e.requestId)) || lastPair;
      if (!pair) return;
      const prev = (pair.path.process.status as SDKStatus) || "queued";
      const to   = mapStatus(e.status);

      if (to === "queued")  pair.path.start();
      if (to === "running") pair.path.running();
      if (to === "done")    pair.path.done();
      if (to === "error")   pair.path.error({ reason: e.reason });

      pair.path.step("server:processing", { ...e }).endStep(true);

      ui.emit({ type: "status:change", pathId: pair.path.id, from: prev, to, meta: e });
      ui.emit({ type: "conversation:update" });
    },
```

- **onAIProcessing**: transitions the path through `queued → running → done/error`, recording a telemetry step.

```ts
    onAIToken: (e) => {
      const pair = (e.requestId && byRequestId.get(e.requestId)) || lastPair;
      if (!pair) return;
      pair.path.running();
      const prev = pair.system.content?.message ?? "";
      const next = prev + (e.token ?? "");
      pair.system.setContent(next, pair.system.content?.options);

      ui.emit({ type: "ai:token", token: e.token, index: e.index, cumulative: next });
      ui.emit({ type: "system:update", message: next, options: pair.system.content?.options });
      ui.emit({ type: "conversation:update" });
    },
```

- **onAIToken**: streams text into the **system placeholder** node; `cumulative` is perfect for rendering incremental assistant bubbles.

```ts
    onAIMessage: (e) => {
      const pair = (e.requestId && byRequestId.get(e.requestId)) || lastPair;
      if (!pair) return;

      pair.path.endStep(true, { usage: e.usage });

      // If your server returns `options`, include them:
      const options = (e as any).options as string[] | undefined;
      if (options) pair.system.setContent(e.text, options);
      else         pair.system.setContent(e.text);

      if (pair.system.content && e.createdAt) {
        pair.system.content.timestamp = Date.parse(e.createdAt);
      }

      convo.resolveAssistant(pair, e.text, { usage: e.usage });

      ui.emit({ type: "ai:message", text: e.text });
      ui.emit({ type: "system:update", message: e.text, options: pair.system.content?.options });
      ui.emit({ type: "conversation:update" });

      if (e.requestId) byRequestId.delete(e.requestId);
    },
```

- **onAIMessage**: finalizes the assistant turn, preserves usage metrics, and emits UI updates. We clear the `requestId` mapping now that this turn is done.

```ts
    onAIError: (e) => {
      const pair = lastPair;
      if (pair) convo.failAssistant(pair, e);
      ui.emit({ type: "error", error: e });
      ui.emit({ type: "conversation:update" });
    },

    onPresenceUpdate: (e) => {
      console.log("presence:update", e.onlineUserIds);
    },
  },
});
```

- **onAIError**: flips the system node & path to **error** and surfaces it to the UI.

### 4.5 Typing UX

```ts
const typing = new TypingObserver(opts.inputSelector, { pauseDelay: 700, stopDelay: 1500 });
typing.on(TypingObserverEvent.TypingStart, () => ui.emit({ type: "typing", kind: "start" }));
typing.on(TypingObserverEvent.Typing,      () => ui.emit({ type: "typing", kind: "tick"  }));
typing.on(TypingObserverEvent.TypingPause, () => ui.emit({ type: "typing", kind: "pause" }));
typing.on(TypingObserverEvent.TypingStop,  () => ui.emit({ type: "typing", kind: "stop"  }));

typing.on(TypingObserverEvent.TypingStart, () => chat.typingStart(opts.userId));
typing.on(TypingObserverEvent.TypingStop,  () => chat.typingStop(opts.userId));
```

- Emits **frontend** typing events for your UI.
- Informs the server of **typingStart/typingStop** to broadcast presence/indicators.

### 4.6 Public helpers (what your UI calls)

```ts
async function send(text: string) {
  const { composed, structuredParts } = composePrompt([
    { kind: "system", text: "You are a helpful assistant." },
    { kind: "guard",  text: "Avoid PII." },
    { kind: "user",   text },
  ]);

  const decision = await moderate(composed);
  if (decision.action === "block") {
    ui.emit({ type: "error", error: { code: "blocked", reason: decision.reason } });
    return null;
  }

  const pair = convo.user(decision.text);
  convo.beginAssistantWork(pair, { composedPrompt: true });
  lastPair = pair;

  chat.sendMessage({
    messageId: pair.user.id,
    userId: opts.userId,
    text: decision.text,
    parts: structuredParts,
    requestId: pair.path.id,   // critical for correlation
  });
  byRequestId.set(pair.path.id, pair);

  ui.emit({ type: "conversation:update" });
  return pair;
}
```

- **Optimistic UI**: we add the user turn **immediately**, open the placeholder system node, and start streaming when tokens arrive.
- **Correlation**: `requestId = pair.path.id` is what ties future `ai:token` and `ai:message` back to this pair—**don’t skip this**.

Other helpers:

```ts
function abort(reason?: string) { chat.abort(reason); }
function markRead(messageIds: string[], readAt = new Date().toISOString()) {
  chat.markRead({ userId: opts.userId, messageIds, readAt });
}
function getConversation() { return convo; }
```

### 4.7 Persist / rebuild / render stubs

```ts
function toShape(): Row[] {
  const rows: Row[] = [];
  for (const path of convo.paths) {
    const user = convo.nodes.find(n => n.id === path.fromId);
    const system = convo.nodes.find(n => n.id === path.toId);
    const row: Row = {};
    if (user?.content?.message) {
      row.user = { message: user.content.message, options: user.content.options, timestamp: user.content.timestamp };
    }
    if (system?.content?.message) {
      row.system = { message: system.content.message, options: system.content.options, timestamp: system.content.timestamp };
    }
    row.status = path.process.status as Row["status"];
    if (row.user or row.system) rows.push(row);
  }
  return rows;
}

function render() {
  ui.emit({ type: "conversation:update" });
}
```

- `toShape()` gives you a **portable** format you can store in localStorage or a DB.
- `render()` is a stub—you’ll replace it with your React/Vue render logic (or throttle within `ui.on`).

### 4.8 Returned surface

```ts
return {
  send,
  abort,
  markRead,
  getConversation,
  onUIEvent: ui.on,
  toShape,
  rebuild: (rows: Row[]) => { convo = rebuildConversationFromShape(rows); render(); },
  socket: chat,
  typing,
};
```

This mirrors a tiny **SDK**: methods your UI calls + access to low‑level objects if needed.

---

## 5) Putting it to Work

```ts
// const sdk = initChatDemo({
//   socketUrl: import.meta.env.VITE_SOCKET_URL,
//   chatId: "room-42",
//   userId: "u-123",
//   inputSelector: "#message",
//   onUIEvent: (evt) => console.log("UI:", evt),
// });
// sdk.send("Hello there");
```

- Create the SDK with your socket URL, chat & user IDs, and a selector for the input.
- Subscribe to `onUIEvent` to hook your renderer (or wire events into your state store).
- Call `sdk.send(text)`—that’s it.

---

## 6) Extending This Pattern

- **Richer status**: add `backoff`, `tool_calling`, etc., and extend `StatusMapper` accordingly.
- **Moderation**: invoke external APIs; add per‑tenant templates; record decisions in `Path.process.steps`.
- **Options/Actions**: let the server return `options: string[]` (quick replies) and pass them to UI as part of `system:update`.
- **Tools**: surface `ai:tool_call` / `ai:tool_result` via `AIChatSocket.callbacks` and record steps in the path.
- **Persistence**: switch `toShape()` to your own schema; keep `requestId` if you need to resume in‑flight turns after reload.

---

## 7) Testing this Example

See **Guide → Testing** for complete Vitest tests. Suggestions:
- unit test `composePrompt`, `moderate`, and `rebuildConversationFromShape`.
- mock the socket and drive `onAIProcessing` → `onAIToken` → `onAIMessage`.
- use jsdom to test typing lifecycle with `TypingObserver`.

> Tip: explicitly type arrays in tests to avoid `never[]` errors:  
> `const names: Array<string | undefined> = [];`
