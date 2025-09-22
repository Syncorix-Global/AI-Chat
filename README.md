# Syncorix AI Chat SDK

Type‑safe, frontend‑first utilities for building **real‑time AI chat UIs**:
- **Socket layer**: a typed Socket.IO client wrapper that streams tokens, presence, and status.
- **Orchestration**: a small **Chat SDK** that wires your socket to a conversation graph and emits friendly UI events.
- **Typing UX**: a lightweight `TypingObserver` for focus/typing/pause/stop (IME‑aware).

> Works in the browser. Bring any Socket.IO backend that speaks your `ChatEvents` contract.

---

## 📦 Install

```bash
# pick one
pnpm add @syncorix/ai-chat-sdk
npm  i   @syncorix/ai-chat-sdk
yarn add @syncorix/ai-chat-sdk
```

**Requirements**
- Node 18+ (for tooling). Your app runs in the browser.
- A Socket.IO server that emits events compatible with your `ChatEvents` types.

---

## 🚀 5‑Minute Quickstart

This is the **simplest path**: create the socket, create the SDK, listen to events, and send a message.

```ts
import { ChatSDK, AIChatSocket } from "@syncorix/ai-chat-sdk";

// 1) Your socket client (connects to your Socket.IO backend)
const socket = new AIChatSocket({
  url: import.meta.env.VITE_SOCKET_URL, // e.g. "http://localhost:4000"
  chatId: "room-1",
  autoConnect: true,
});

// 2) High-level SDK that wires socket → conversation graph → UI events
const sdk = new ChatSDK({
  socket,
  chatId: "room-1",
  userId: "user-123",
  typing: { target: "#message", autoEmit: true }, // optional: emits typingStart/typingStop
});

// 3) Subscribe to key events for your UI
sdk.on("conversation:update", ({ conversation }) => {
  // Render bubbles from conversation.nodes (USER → SYSTEM pairs via conversation.paths)
});
sdk.on("status:change", ({ to }) => {
  // to = "queued" | "running" | "done" | "error" → show spinners/progress
});
sdk.on("ai:token", ({ cumulative }) => {
  // streaming text for the current assistant message
});
sdk.on("system:update", ({ message, options }) => {
  // assistant bubble (final or mid‑stream); render optional quick‑reply options[] if provided
});
sdk.on("error", ({ error }) => console.warn(error));

// 4) Send a user message
sdk.sendText("Hello!");

// (Optional) Abort the current assistant turn
sdk.abort("user canceled");

// (Optional) Mark messages as read
sdk.markRead(["msg-1", "msg-2"]);
```

**React tip:** Put `sdk` in a context or a store (e.g., Zustand/Redux), and update your UI from `conversation:update` / `system:update` events.

---

## 🧠 Prompt composition & moderation (frontend‑controlled)

You control what gets sent. Build your prompt locally (system/guard/user), optionally moderate it, then call `sdk.sendText()`.

```ts
function composePrompt(userText: string) {
  const system = "You are a helpful assistant.";
  const guard  = "Avoid PII.";
  // final string the model will see
  const composed = [system, guard, userText].join("\n\n");
  return composed;
}

async function onSend(userText: string) {
  const composed = composePrompt(userText);
  // optional: run your own moderation pipeline here
  // if blocked → show UI and return
  await sdk.sendText(composed);
}
```

The SDK will optimistically append a USER node, open the paired SYSTEM node, and stream tokens/status as events arrive from your server.

---

## ✍️ Typing Observer (standalone or via SDK)

Observe typing/focus with IME support.

```ts
import { TypingObserver, TypingObserverEvent } from "@syncorix/ai-chat-sdk/typing-observer";

const ob = new TypingObserver("#message", { pauseDelay: 700, stopDelay: 1500 });

ob.on(TypingObserverEvent.TypingStart, () => console.log("start"));
ob.on(TypingObserverEvent.Typing,      (e) => console.log("value:", e.value));
ob.on(TypingObserverEvent.TypingPause, () => console.log("pause"));
ob.on(TypingObserverEvent.TypingStop,  () => console.log("stop"));
```

> When you pass `typing: { target, autoEmit: true }` to `ChatSDK`, it will automatically call `socket.typingStart/typingStop` and emit a unified `typing` event for your UI.

---

## 🧱 Rebuild history (hydrate from a saved shape)

If you persist a simple array of rows, you can rebuild the conversation graph on load:

```ts
import { rebuildConversationFromShape } from "@syncorix/ai-chat-sdk";

type Msg = { message: string; options?: string[]; timestamp?: number };
type Row = { user?: Msg; system?: Msg; status?: "queued"|"running"|"done"|"error" };

const rows: Row[] = JSON.parse(localStorage.getItem("chat-shape") || "[]");
const convo = rebuildConversationFromShape(rows);
```

Use `convo.nodes` and `convo.paths` to render. New traffic from the SDK continues on top of the rebuilt graph.

---

## 📚 Essential API (what you’ll actually use)

### Exports (package root)
```ts
import {
  ChatSDK,                // orchestrates socket → conversation → UI events
  AIChatSocket,           // typed Socket.IO client wrapper
  TypingObserver,         // typing/focus observer (also available via subpath)
  TypingObserverEvent,
  rebuildConversationFromShape, // hydrate from a simple shape
  Conversation,           // low-level graph (optional direct use)
} from "@syncorix/ai-chat-sdk";
```

### `new ChatSDK(options)`
```ts
type ChatSDKOptions = {
  socket: AIChatSocket;
  chatId: string | number;
  userId: string | number;
  typing?: { target: HTMLElement | string; options?: { pauseDelay?: number; stopDelay?: number; trackSelection?: boolean }; autoEmit?: boolean };
  mapStatus?: (serverStatus: any) => "queued" | "running" | "done" | "error"; // optional mapper
};
```
**Common methods**
- `sendText(text: string, extra?)` → creates a USER→SYSTEM pair, sends to server.
- `abort(reason?)` → asks server to stop the current assistant turn.
- `markRead(messageIds: string[], readAtISO?)` → acknowledge message reads.
- `on(event, handler)` / `off(event, handler)` → subscribe/unsubscribe.

**Events you’ll likely handle**
- `conversation:update` → render from `conversation`.
- `status:change`       → `"queued" | "running" | "done" | "error"`.
- `ai:token`            → `{ token, index, cumulative }` for streaming.
- `system:update`       → `{ message, options? }` for the assistant bubble.
- `ai:message`          → final assistant message (with optional usage).
- `typing`              → `{ kind: "start"|"tick"|"pause"|"stop" }`.
- `error`               → any surfaced error object.

### Socket client (if you use it directly)
```ts
const socket = new AIChatSocket({
  url: "http://localhost:4000",
  chatId: "room-1",
  autoConnect: true,
  callbacks: {
    onAIMessage: (e) => console.log(e.text),
    onAIToken:   (e) => console.log(e.token),
  },
});
socket.sendMessage({ messageId: crypto.randomUUID(), userId: "user-1", text: "Hello" });
```

---

## 🧪 Playground & Mock Server (optional)

We ship a small Vite playground and a mock Socket.IO server to help you try the SDK end‑to‑end while you integrate your own backend.

```bash
pnpm dev:all          # runs mock server (4000) + playground (5173)
# or start just one
pnpm mock:dev
pnpm playground:dev
```

Create `playground/.env`:
```ini
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

---

## ❓ Troubleshooting

- **Nothing streams**: Check your server emits `ai:processing`, `ai:token`, and `ai:message` (matching your `ChatEvents`). Confirm CORS and Socket.IO path.
- **Can’t connect**: Verify `VITE_SOCKET_URL`, and that transports include `websocket` on both sides if you disabled polling.
- **Types missing**: Ensure your bundler resolves package exports; Vite/TS works out of the box. If using path aliases, avoid shadowing `@syncorix/ai-chat-sdk`.
- **SSR**: Instantiate the SDK/socket **in the browser** (e.g., inside a `useEffect` in Next.js).

---

## 📄 License

MIT © Syncorix Global

---

## 🛠️ Contributing / Releases (repo meta)

- Dev scripts:
  ```bash
  pnpm i
  pnpm test
  pnpm build
  pnpm dev:all
  ```
- Tag‑based release to npm + GitHub Release (requires `NPM_TOKEN`):
  ```bash
  pnpm version patch|minor|major
  git push && git push --tags
  ```
- Docs live in `docs/` (VitePress): `pnpm docs:dev`

**Repository**: https://github.com/Syncorix-Global/AI-Chat  
**Docs**: https://docs.syncorixglobal.ai
