---
title: Examples
outline: deep
---

# Examples

## React (basic)

```tsx
import { useEffect, useMemo, useState } from "react";
import { ChatSDK, AIChatSocket } from "@syncorix/ai-chat-sdk";

export function Chat() {
  const socket = useMemo(() => new AIChatSocket({ url: "/socket", chatId: "room-1" }), []);
  const [sdk] = useState(() => new ChatSDK({ socket, chatId: "room-1", userId: "u1" }));
  const [text, setText] = useState("");

  useEffect(() => {
    const off = sdk.on("conversation:update", ({ conversation }) => {
      // set state from conversation to re-render
    });
    return () => off();
  }, [sdk]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sdk.sendText(text);
        setText("");
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button>Send</button>
    </form>
  );
}
```

## Vanilla (no framework)

```ts
import { AIChatSocket, ChatSDK } from "@syncorix/ai-chat-sdk";

const socket = new AIChatSocket({ url: "http://localhost:4000", chatId: "room-1" });
const sdk = new ChatSDK({ socket, chatId: "room-1", userId: "user-1" });

sdk.on("system:update", ({ message }) => {
  document.querySelector("#assistant")!.textContent = message ?? "";
});

(document.querySelector("#form") as HTMLFormElement).addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (document.querySelector("#message") as HTMLInputElement).value;
  sdk.sendText(text);
});
```

## Prompt composition + moderation

```ts
function compose(userText: string) {
  const system = "You are helpful.";
  const guard  = "Avoid PII.";
  return [system, guard, userText].join("\n\n");
}

async function sendSafe(sdk: any, userText: string) {
  const composed = compose(userText);
  // optional moderation
  await sdk.sendText(composed);
}
```

## Hydration from transcript/shape

- **Shape**: `[{ user?, system?, status? }]` → `rebuildConversationFromShape()`.
- **Tuple transcript**: `{ user?: [text, ts], system?: [text, ts] }[]` → `rebuildConversationFromTranscript()`.

---

## React (no rooms + arbitrary connect params) — *new*

Some backends don’t use rooms and require custom params (e.g., `consultationId`). You can now skip the join and pass arbitrary params without changing other code.

```tsx
import { useMemo } from "react";
import { ChatSDK, AIChatSocket } from "@syncorix/ai-chat-sdk";

export function ChatNoRooms() {
  const socket = useMemo(() => new AIChatSocket({
    url: import.meta.env.VITE_SOCKET_URL,
    ioOptions: {
      transports: ["websocket"],
      query: { consultationId: "abc-123" }, // any param name/shape
      // or: auth: { token: "..." }
    },
    joinEvent: null,                        // ← skip room join
    meta: { consultationId: "abc-123" },    // ← merged into all client→server emits
  }), []);

  const sdk = useMemo(() => new ChatSDK({ socket, chatId: "ui-thread-1", userId: "u1", typing: { target: "#message", autoEmit: true } }), [socket]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = document.querySelector("#message") as HTMLInputElement;
        sdk.sendText(input.value);
        input.value = "";
      }}
    >
      <input id="message" />
      <button>Send</button>
    </form>
  );
}
```

## Listening to raw backend topics (optional) — *new*

When you don’t want to remap a server topic, use the raw hooks directly.

```ts
const off = socket.onRaw("consultation-result", (payload) => {
  console.log("consultation-result:", payload);
});

// later
off();
```
