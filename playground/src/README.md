# Realtime Client & Interaction Playground

This repository contains:

- **Socket Layer**
  - `ChatEvents.ts` — Typed event contract
  - `SocketService.ts` — Generic typed Socket.IO wrapper
  - `AIChatSocket.ts` — High-level AI chat client (callbacks + helpers)

- **Interactions**
  - `TypingObserver.ts` — Self-contained typing/focus tracker (inputs, textareas, contenteditable)

- **Dev Utilities**
  - `playground/` — Vite React playground (dark mode UI, tabbed examples)
  - `mock-server/` — Socket.IO mock server for AI streaming

---

## Quick Start

```bash
# from repo root
pnpm i

# run mock server (http://localhost:4000)
pnpm mock:dev

# in another terminal, run playground (http://localhost:5173)
pnpm playground:dev
```

Configure `playground/.env`:

```
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

---

## Modules

### 1) ChatEvents.ts
Defines all event names/payloads for client/server. Keep this as the single source of truth.

### 2) SocketService.ts
Generic, typed Socket.IO client.

- Auto-joins room via `joinEvent` (default `chat:join`)
- Typed `emit`, `on`, `off`
- Lifecycle helpers (`connect`, `disconnect`, `isConnected`)
- Optional initial `handlers` map

### 3) AIChatSocket.ts
High-level AI chat client built on `SocketService`.

- Callbacks (AI streaming, tool calls, errors, presence)
- Helpers: `sendMessage`, `typingStart`, `typingStop`, `abort`, `markRead`
- Pass through Socket.IO options (`ioOptions`) for auth/headers

### 4) TypingObserver.ts
Self-contained typing/focus/IME-aware utility.

- Events: `Focus`, `Blur`, `TypingStart`, `Typing`, `TypingPause`, `TypingStop`
- Options: `pauseDelay`, `stopDelay`, `trackSelection`

---

## Playground (React, dark mode)

Open **two demos** via the top-right tabs:

- **AI Chat** — streams tokens from the mock server and shows final AI messages
- **TypingObserver** — visual border glow + status pill + event log

> `playground/src/components/TypingObserverDemo.tsx` is the React port of the original HTML example.

---

## Mock Server

A Socket.IO server that simulates:

- `chat:join` → room join
- `chat:message` → echo user messages
- `ai:processing` → status + ETA
- `ai:token` → streamed tokens
- `ai:message` → final assistant message
- Optional: `ai:tool_call` → `ai:tool_result` (extend when needed)

Run:

```bash
pnpm mock:dev
```

---

## Scripts

```bash
pnpm mock:dev        # mock server
pnpm playground:dev  # vite playground
pnpm dev:all         # both concurrently
pnpm test            # unit tests
pnpm build           # build library
```

---

## Conventions

- **Strong Types**: all events must be declared in `ChatEvents.ts`
- **No magic strings**: prefer enums or union types where possible
- **Minimal JSDoc**: each public method gets a short JSDoc (what/params/returns)
- **Dark mode by default**: playground styles are tuned for dark UI

# AI Chat & TypingObserver Playground

This is the **demo playground** for the `@syncorix/consultation` library.  
It lets you run both:

- **AI Chat Demo** — using `AIChatSocket` to connect to the mock Socket.IO server.
- **TypingObserver Demo** — using `TypingObserver` to capture focus/typing states.

The playground is built with **Vite + React** and styled minimally for clarity.

---

## 1. Running the Playground

From the repo root:

```bash
# install deps
pnpm i

# run mock server + playground together
pnpm dev:all

# or separately
pnpm mock:dev
pnpm playground:dev
```

- Playground UI: <http://localhost:5173>
- Mock server: <http://localhost:4000>

Configure `playground/.env`:

```bash
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

---

## 2. Project Structure

```
playground/
  ├── index.html            # mount point <div id="root">
  ├── src/
  │   ├── main.tsx          # bootstraps <App />
  │   ├── App.tsx           # shell with tab switcher
  │   └── components/
  │        ├── AIChatDemo.tsx
  │        └── TypingObserverDemo.tsx
  └── README.md             # this file
```

---

## 3. Components

### `App.tsx`
- Acts as the **shell**.
- Provides a header with two tabs:
  - **AI Chat**
  - **TypingObserver**
- Switches which demo component renders via React state.

### `AIChatDemo.tsx`
- Wraps the **`AIChatSocket`** class.
- Handles connection lifecycle, presence, streaming tokens, and messages.
- Provides:
  - **Message log** — user and assistant messages.
  - **Streaming output** — incremental tokens as they arrive.
  - **Controls**:
    - Input box (triggers `typingStart`/`typingStop` on focus/blur).
    - Send button (`sendMessage`).
    - Abort button (`abort` an AI response).
  - **Presence display**.

**Key setup:**
```ts
const chat = new AIChatSocket({
  url: import.meta.env.VITE_SOCKET_URL,
  chatId: import.meta.env.VITE_CHAT_ID,
  callbacks: {
    onAIMessage: (evt) => { ... },
    onAIToken: (evt) => { ... },
    onAIProcessing: (evt) => { ... },
    onPresenceUpdate: (evt) => { ... },
  },
  autoConnect: true
});
```

### `TypingObserverDemo.tsx`
- Wraps the **`TypingObserver`** utility.
- Monitors `<textarea>` element for:
  - Focus / Blur
  - Typing Start / Typing / Typing Pause / Typing Stop
- Provides:
  - **Border glow + color** depending on state.
  - **Status pill** with current label.
  - **Event log** printed below.

**Key setup:**
```ts
const observer = observeTyping(textareaRef.current, {
  pauseDelay: 700,
  stopDelay: 1400
});

observer.on(TypingObserverEvent.TypingStart, () => { ... });
observer.on(TypingObserverEvent.TypingPause, () => { ... });
```

---

## 4. Extending the Playground

- Add new demo components under `playground/src/components/`.
- Add a new tab in `App.tsx` to switch to your demo.
- Use the same pattern: `DemoName.tsx` + `Tab` selection.

---

## 5. Notes

- **Dark mode**: UI is tuned for dark backgrounds.
- **Hot reload**: Vite auto-refreshes on changes.
- **Mocks**: All socket traffic goes through the mock server. Replace with your real backend later.

---

## 6. Scripts

```bash
pnpm playground:dev  # run only the playground
pnpm mock:dev        # run only the mock server
pnpm dev:all         # run both (recommended)
```
