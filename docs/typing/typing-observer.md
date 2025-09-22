---
title: TypingObserver
outline: deep
---

# TypingObserver

```ts
import { TypingObserver, TypingObserverEvent } from "@syncorix/ai-chat-sdk/typing-observer";

const ob = new TypingObserver("#message", { pauseDelay: 700, stopDelay: 1500 });

const off = ob.on(TypingObserverEvent.Typing, (e) => {
  console.log(e.value, e.selection);
});

// later
off();
ob.destroy();
```
