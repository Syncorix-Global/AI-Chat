import { observeTyping, TypingObserverEvent } from "./TypingObserver";

// Assume there's an element in your app:
// <textarea id="message" rows="3"></textarea>
const observer = observeTyping("#message", { pauseDelay: 800, stopDelay: 2000 });

observer.on(TypingObserverEvent.Focus, (e) => {
  console.log("[Focus]", e.value);
});

observer.on(TypingObserverEvent.TypingStart, (e) => {
  console.log("[Start]", e.value);
});

observer.on(TypingObserverEvent.Typing, (e) => {
  console.log("[Typing]", e.value);
});

observer.on(TypingObserverEvent.TypingPause, () => {
  console.log("[Pause]");
});

observer.on(TypingObserverEvent.TypingStop, () => {
  console.log("[Stop]");
});

observer.on(TypingObserverEvent.Blur, (e) => {
  console.log("[Blur]", e.value);
});

// later, if you need to clean up:
// observer.destroy();
