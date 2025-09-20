# typing-observer

A small, dependency-free, fully-typed utility to observe **typing** and **focus** across `<input>`, `<textarea>`, and `[contenteditable]` elements.

- Events via a strongly-typed **enum** (`TypingObserverEvent.TypingStart`, etc.).
- Minimal but clear JSDoc.
- Works with IME (composition events) and optional selection tracking.
- No runtime dependencies.

## Installation

```bash
npm install @syncorix/typing-observer
# or
pnpm add @syncorix/typing-observer
```

## Usage

```ts
import { observeTyping, TypingObserverEvent } from "@syncorix/typing-observer";

const observer = observeTyping("#message", { pauseDelay: 800, stopDelay: 2000 });

observer.on(TypingObserverEvent.TypingStart, (event) => {
  console.log("User started typing:", event.value);
});

observer.on(TypingObserverEvent.Typing, (event) => {
  console.log("User typed:", event.value);
});

observer.on(TypingObserverEvent.TypingPause, () => console.log("Paused"));
observer.on(TypingObserverEvent.TypingStop, () => console.log("Stopped"));
observer.on(TypingObserverEvent.Focus, () => console.log("Focus"));
observer.on(TypingObserverEvent.Blur, () => console.log("Blur"));

// later
observer.destroy();
```

## API

### `observeTyping(target, options?) => TypingObserver`
Creates and starts an observer for a single editable element (or selector).

**Options**
- `pauseDelay` (ms) – inactivity before `TypingPause` (default `1000`).
- `stopDelay` (ms) – inactivity or blur before `TypingStop` (default `2000`).
- `trackSelection` (boolean) – enrich events with selection info (default `true`).

### `TypingObserver`
- `on(event: TypingObserverEvent, fn) => () => void` – subscribe, returns unsubscribe.
- `off(event: TypingObserverEvent, fn)` – remove listener.
- `current() => BaseTypingEvent` – current snapshot (`value`, `selection`, metadata).
- `bump()` – programmatically indicate value changed and refresh timers.
- `destroy()` – remove listeners and timers.

### Events (enum)
```ts
export enum TypingObserverEvent {
  Focus = "focus",
  Blur = "blur",
  TypingStart = "typingStart",
  Typing = "typing",
  TypingPause = "typingPause",
  TypingStop = "typingStop",
}
```

## Testing

This repo uses **Vitest** with **jsdom**. Minimal example:

```bash
pnpm i -D vitest jsdom @types/jsdom
pnpm vitest
```

**File structure**
```
src/TypingObserver.ts
tests/utils/dom.ts
tests/TypingObserver.test.ts
```
