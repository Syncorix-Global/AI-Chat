---
title: Typing (entry)
outline: deep
---

# Typing (entry)

Shorthand:

```ts
import { observeTyping, TypingObserverEvent } from "@syncorix/ai-chat-sdk/typing-observer";

const ob = observeTyping("#message"); // same options as TypingObserver
ob.on(TypingObserverEvent.TypingStart, () => {/* ... */});
```
