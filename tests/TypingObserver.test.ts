import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TypingObserver,
  observeTyping,
  TypingObserverEvent,
} from "@typingObserver/TypingObserver";

/** Small helpers (inline to keep this file standalone) */
function createInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  document.body.appendChild(input);
  return input;
}
function focus(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
}
function blur(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}
function typeText(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string
): void {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TypingObserver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("emits start → typing → pause → stop", () => {
    const input = createInput();
    const obs = observeTyping(input, { pauseDelay: 300, stopDelay: 600 });

    const events: string[] = [];
    obs.on(TypingObserverEvent.TypingStart, () => events.push("start"));
    obs.on(TypingObserverEvent.Typing, () => events.push("typing"));
    obs.on(TypingObserverEvent.TypingPause, () => events.push("pause"));
    obs.on(TypingObserverEvent.TypingStop, () => events.push("stop"));

    focus(input);
    typeText(input, "h");

    expect(events).toEqual(["start", "typing"]);

    vi.advanceTimersByTime(300); // pauseDelay
    expect(events).toEqual(["start", "typing", "pause"]);

    vi.advanceTimersByTime(300); // to stop
    expect(events).toEqual(["start", "typing", "pause", "stop"]);

    obs.destroy();
  });

  it("emits stop on blur even before stopDelay", () => {
    const input = createInput();
    const obs = new TypingObserver(input, { pauseDelay: 500, stopDelay: 2000 });

    const emitted: TypingObserverEvent[] = [];
    obs.on(TypingObserverEvent.TypingStart, () =>
      emitted.push(TypingObserverEvent.TypingStart)
    );
    obs.on(TypingObserverEvent.TypingStop, () =>
      emitted.push(TypingObserverEvent.TypingStop)
    );

    focus(input);
    typeText(input, "a"); // start + typing

    blur(input); // should cause immediate stop
    expect(emitted).toEqual([
      TypingObserverEvent.TypingStart,
      TypingObserverEvent.TypingStop,
    ]);

    obs.destroy();
  });

  it("bump() behaves like input and resets timers", () => {
    const input = createInput();
    const obs = new TypingObserver(input, { pauseDelay: 200, stopDelay: 400 });

    const events: TypingObserverEvent[] = [];
    obs.on(TypingObserverEvent.TypingStart, () =>
      events.push(TypingObserverEvent.TypingStart)
    );
    obs.on(TypingObserverEvent.Typing, () =>
      events.push(TypingObserverEvent.Typing)
    );
    obs.on(TypingObserverEvent.TypingStop, () =>
      events.push(TypingObserverEvent.TypingStop)
    );

    focus(input);
    typeText(input, "x"); // start + typing
    vi.advanceTimersByTime(150);

    obs.bump(); // programmatic change → should emit typing again, reset timers

    expect(events).toEqual([
      TypingObserverEvent.TypingStart,
      TypingObserverEvent.Typing,
      TypingObserverEvent.Typing,
    ]);

    vi.advanceTimersByTime(400);
    expect(events[events.length - 1]).toBe(TypingObserverEvent.TypingStop);

    obs.destroy();
  });
});
