# Syncorix AI Chat SDK

Typed realtime chat + typing UX for AI chat applications.  
This package provides a **Socket.IO client wrapper** and **typing observer** with strong TypeScript contracts, plus a playground and mock server for development.

---

## ✨ Features

- **Typed Socket Layer**
  - `ChatEvents` → single source of truth for events
  - `SocketService` → low-level Socket.IO wrapper with full typing
  - `AIChatSocket` → high-level client with callbacks & helpers
- **Typing Layer**
  - `TypingObserver` → focus + typing detection (with IME support)
- **Playground**
  - React + Vite demo UI
  - Mock Socket.IO server simulating AI lifecycle events

---

## 📦 Installation

```bash
pnpm i @syncorix/AI Chat SDK
```

---

## 🚀 Quickstart (Integrator Guide)

### 1. Connect to a Chat

```ts
import { AIChatSocket } from "@sockets/AIChatSockets";
import type { ChatID } from "@sockets/ChatEvents";

const chat = new AIChatSocket({
  url: "https://realtime.example.com",
  chatId: "room-1" as ChatID,
  ioOptions: { transports: ["websocket"], auth: { token: "JWT" } },
  callbacks: {
    onConnect: () => console.log("connected"),
    onAIMessage: (e) => console.log("assistant:", e.text),
    onChatMessage: (e) => console.log("user:", e.text),
    onAIError: (e) => console.error("ai error:", e.message)
  }
});
```

### 2. Send a Message

```ts
chat.sendMessage({
  messageId: crypto.randomUUID(),
  userId: "user-1",
  text: "Hello!"
});
```

### 3. Typing Indicators

```ts
chat.typingStart("user-1");
chat.typingStop("user-1");
```

### 4. Abort or Mark Read

```ts
chat.abort("user canceled");

chat.markRead({
  userId: "user-1",
  messageIds: ["m1", "m2"],
  readAt: new Date().toISOString()
});
```

---

## 🧩 Typing Observer

Detect when a user is typing, pausing, or stopping.

```ts
import { observeTyping, TypingObserverEvent } from "@syncorix/AI Chat SDK/typing";

const ob = observeTyping("#message", { pauseDelay: 700, stopDelay: 1400 });

ob.on(TypingObserverEvent.TypingStart, () => console.log("start"));
ob.on(TypingObserverEvent.Typing, (e) => console.log("value=", e.value));
ob.on(TypingObserverEvent.TypingPause, () => console.log("pause"));
ob.on(TypingObserverEvent.TypingStop, () => console.log("stop"));
```

---

## 🎨 Playground & Mock Server

Run a local mock server and playground UI for testing.

```bash
pnpm dev:all
```

- Playground → [http://localhost:5173](http://localhost:5173)
- Mock server → [http://localhost:4000](http://localhost:4000)

Configure `playground/.env`:

```ini
VITE_SOCKET_URL=http://localhost:4000
VITE_CHAT_ID=room-1
VITE_USER_ID=user-123
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full details.

## 📦 Release

This package publishes to **npm** via a GitHub Actions workflow that runs on **tags** like `v0.1.1`.  
The workflow installs deps, runs tests, builds, publishes to npm **with provenance**, and then creates a GitHub Release.

### One-time setup

- In your GitHub repo, add a secret: **`NPM_TOKEN`** (npm → Access Tokens → Automation).
- Ensure your `package.json` has:
  ```json
  {
    "name": "@syncorix/ai-chat-sdk",
    "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org" },
    "packageManager": "pnpm@9.15.9",
    "engines": { "node": ">=18" }
  }
  ```
- The workflow file lives at: `.github/workflows/release.yml`.

### Tag-based release (recommended)

1. Bump the version locally (updates `package.json` and creates a git tag):
   ```bash
   # choose one:
   pnpm version patch     # 0.1.0 -> 0.1.1
   pnpm version minor     # 0.1.x -> 0.2.0
   pnpm version major     # x.y.z -> (x+1).0.0
   # or set an exact version:
   pnpm version 0.1.1
   ```

2. Push the commit and tag:
   ```bash
   git push
   git push --tags
   ```

3. The **Release (npm)** workflow runs automatically.  
   When it finishes, your new version is on npm and a GitHub Release is created.

### Manual release (optional)

- Actions → **Release (npm)** → **Run workflow**.  
- (Optional) provide a `version` input like `patch`, `minor`, `major`, or `0.1.1` to bump `package.json` before publish.
- The job will **test**, **build**, and **publish** the current HEAD.

### What the workflow enforces

- Uses Node **21.7.3** (configurable).
- Uses pnpm version from `package.json`’s `packageManager` (no duplicate version pin in the action).
- Verifies the pushed tag matches `package.json` (e.g., tag `v0.1.1` must equal `"version": "0.1.1"`).
- Publishes with:
  ```bash
  npm publish --provenance --access public
  ```
  (requires `id-token: write` permission and the `NPM_TOKEN` secret)

### Troubleshooting

- **Tag mismatch**: “Tag does not match package.json version”
  ```bash
  git tag -d vBAD && git push origin :refs/tags/vBAD
  pnpm version 0.1.1
  git push && git push --tags
  ```
- **pnpm version conflict**: Do **not** set `with: version:` in `pnpm/action-setup@v4` if you already pin pnpm via `package.json`’s `packageManager`.
- **2FA account**: Use an **Automation** token on npm; classic 2FA tokens won’t work for CI publishes.

### Release checklist

- [ ] All tests pass locally: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Changelog/README updated if needed
- [ ] Version bumped and tag pushed (`vX.Y.Z`)


### Highlights

- **Type-first** → All events defined in `ChatEvents.ts` (update both client & server).
- **Granular layers** → Low-level (`SocketService`), high-level (`AIChatSocket`).
- **Docs** → Keep `docs/` updated when adding features.

---

## 📄 License

MIT
