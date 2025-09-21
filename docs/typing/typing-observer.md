---
title: TypingObserver API
description: Consistent typing state detection for inputs, textareas and contenteditable (IME-safe)
---

# TypingObserver

## Import

```ts
import { observeTyping, TypingObserverEvent } from "@typingObserver/TypingObserver";
// In the published package:
// import { observeTyping, TypingObserverEvent } from "@syncorix/consultation/typing";
```

## API

```ts
const observer = observeTyping(target: Element | string, options?: {
  pauseDelay?: number;      // ms before TypingPause (default 1000)
  stopDelay?: number;       // ms before TypingStop  (default 2000)
  trackSelection?: boolean; // include selection info (default true)
});

// Events
observer.on(TypingObserverEvent.Focus, (e) => { /* … */ });
observer.on(TypingObserverEvent.Blur, (e) => { /* … */ });
observer.on(TypingObserverEvent.TypingStart, (e) => { /* … */ });
observer.on(TypingObserverEvent.Typing, (e) => { /* e.value, e.selection */ });
observer.on(TypingObserverEvent.TypingPause, (e) => { /* … */ });
observer.on(TypingObserverEvent.TypingStop, (e) => { /* … */ });

// Cleanup
observer.destroy();
```

## Example

```ts
const ob = observeTyping("#message", { pauseDelay: 700, stopDelay: 1400 });

ob.on(TypingObserverEvent.TypingStart, () => console.log("start"));
ob.on(TypingObserverEvent.Typing, (e) => console.log("value=", e.value));
ob.on(TypingObserverEvent.TypingPause, () => console.log("pause"));
ob.on(TypingObserverEvent.TypingStop, () => console.log("stop"));
```

> Tip: wire `TypingStart` to `chat.typingStart()` and `TypingStop/Pause/Blur` to `chat.typingStop()` for presence indicators.
