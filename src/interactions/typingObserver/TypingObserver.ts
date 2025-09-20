/*
 * TypingObserver.ts
 * ------------------------------------------------------------
 * A self-contained, fully typed utility to observe typing and focus
 * across <input>, <textarea>, and [contenteditable] elements.
 *
 * Emits lifecycle events via an enum (TypingObserverEvent):
 * - Focus, Blur
 * - TypingStart (first input after idle)
 * - Typing       (on each input mutation)
 * - TypingPause  (no input for `pauseDelay`, still focused)
 * - TypingStop   (idle for `stopDelay` OR blur)
 *
 * Design goals:
 * - Clear variable/function names
 * - Minimal, essential JSDoc for API + key internals
 * - No external dependencies; drop-in ready
 * - Works with IME (composition events) and selection tracking (optional)
 */

/** Elements the observer can monitor. */
export type EditableTarget =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLElement;

/** Classifies the source element. */
export type SourceKind = "input" | "textarea" | "contenteditable" | "other";

/** Supported event names as enum for clarity and autocompletion. */
export enum TypingObserverEvent {
  Focus = "focus",
  Blur = "blur",
  TypingStart = "typingStart",
  Typing = "typing",
  TypingPause = "typingPause",
  TypingStop = "typingStop",
}

/** Inactivity and behavior options. */
export interface TypingObserverOptions {
  /** ms of inactivity before a temporary pause is emitted (default: 1000). */
  pauseDelay?: number;
  /** ms of inactivity (or blur) before a final stop is emitted (default: 2000). */
  stopDelay?: number;
  /** If true, enrich events with selection info when detectable (default: true). */
  trackSelection?: boolean;
}

/** Base payload for all emitted events. */
export interface BaseTypingEvent {
  /** When the event was created (ms since epoch). */
  timestamp: number;
  /** The element being observed. */
  target: EditableTarget;
  /** Classified element kind. */
  source: SourceKind;
  /** Current text value of the target. */
  value: string;
  /** Start/end indices of selection if detectable; otherwise null. */
  selection?: { start: number; end: number } | null;
}

export interface FocusEventPayload extends BaseTypingEvent {}
export interface BlurEventPayload extends BaseTypingEvent {}
export interface TypingStartPayload extends BaseTypingEvent {}
export interface TypingTickPayload extends BaseTypingEvent {}
export interface TypingPausePayload extends BaseTypingEvent {}
export interface TypingStopPayload extends BaseTypingEvent {}

/** Typed mapping of event names to payload shapes. */
export interface TypingObserverEventMap {
  [TypingObserverEvent.Focus]: FocusEventPayload;
  [TypingObserverEvent.Blur]: BlurEventPayload;
  [TypingObserverEvent.TypingStart]: TypingStartPayload;
  [TypingObserverEvent.Typing]: TypingTickPayload; // fires on each input mutation
  [TypingObserverEvent.TypingPause]: TypingPausePayload; // no input for `pauseDelay`, still focused
  [TypingObserverEvent.TypingStop]: TypingStopPayload; // no input for `stopDelay` OR on blur
}

export type Listener<E extends keyof TypingObserverEventMap> = (
  evt: TypingObserverEventMap[E]
) => void;

/**
 * Minimal, typed event emitter used internally by the observer.
 * - on(): add listener → returns unsubscribe
 * - off(): remove listener
 * - emit(): notify listeners
 */
class Emitter {
  private handlers: { [K in keyof TypingObserverEventMap]?: Set<Listener<any>> } = {};

  /** Register a listener and get an unsubscribe function. */
  on<E extends keyof TypingObserverEventMap>(
    eventName: E,
    listener: Listener<E>
  ): () => void {
    const set = (this.handlers[eventName] ??= new Set());
    set.add(listener as Listener<any>);
    return () => this.off(eventName, listener);
  }

  /** Remove a previously registered listener. */
  off<E extends keyof TypingObserverEventMap>(
    eventName: E,
    listener: Listener<E>
  ): void {
    this.handlers[eventName]?.delete(listener as Listener<any>);
  }

  /** Emit an event to all current listeners. */
  emit<E extends keyof TypingObserverEventMap>(
    eventName: E,
    payload: TypingObserverEventMap[E]
  ): void {
    const snapshot = new Set(this.handlers[eventName] ?? []);
    for (const fn of snapshot) (fn as Listener<E>)(payload);
  }

  /** Remove all listeners. */
  clear(): void {
    (Object.keys(this.handlers) as (keyof TypingObserverEventMap)[]).forEach(
      (name) => this.handlers[name]?.clear()
    );
  }
}

// ---------- DOM helpers ----------

const isInputElement = (element: Element): element is HTMLInputElement =>
  element instanceof HTMLInputElement;
const isTextareaElement = (element: Element): element is HTMLTextAreaElement =>
  element instanceof HTMLTextAreaElement;

/** Get the plain text value from the target element in a normalized way. */
function getTextValue(element: EditableTarget): string {
  if (isInputElement(element) || isTextareaElement(element))
    return element.value ?? "";
  const isEditable = element.getAttribute("contenteditable") !== null;
  if (isEditable) return (element.textContent ?? "").replace(/\u00A0/g, " ");
  return (element as HTMLElement).innerText ?? "";
}

/** Classify the element for analytics/logging. */
function getSourceKind(element: EditableTarget): SourceKind {
  if (isInputElement(element)) return "input";
  if (isTextareaElement(element)) return "textarea";
  return element.getAttribute("contenteditable") !== null
    ? "contenteditable"
    : "other";
}

/**
 * Attempt to compute selection start/end indices for the element.
 * For contenteditable, we approximate by text length within the element.
 */
function getSelectionRange(
  element: EditableTarget
): { start: number; end: number } | null {
  if (isInputElement(element) || isTextareaElement(element)) {
    try {
      const start = element.selectionStart ?? -1;
      const end = element.selectionEnd ?? -1;
      return start >= 0 && end >= 0 ? { start, end } : null;
    } catch {
      return null;
    }
  }
  const isEditable = element.getAttribute("contenteditable") !== null;
  if (!isEditable) return null;
  const selection = element.ownerDocument?.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  )
    return null;

  // Build a prefix range to count characters up to selection start
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(element);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  const start = prefixRange.toString().length;

  // Range length is the selection size
  const length = range.toString().length;
  return { start, end: start + length };
}

/** Create a consistent snapshot payload for emission. */
function createSnapshot(element: EditableTarget): BaseTypingEvent {
  return {
    timestamp: Date.now(),
    target: element,
    source: getSourceKind(element),
    value: getTextValue(element),
    selection: getSelectionRange(element),
  };
}

// ---------- Core Observer ----------

/**
 * Observes a single editable element and emits focus/typing lifecycle events.
 */
export class TypingObserver {
  private element: EditableTarget;
  private options: Required<TypingObserverOptions>;
  private emitter = new Emitter();

  // Timers and state
  private pauseTimerId: number | null = null;
  private stopTimerId: number | null = null;
  private isFocused = false;
  private hasTypedSinceFocus = false;

  // Bound handlers (stable references for add/removeEventListener)
  private boundHandlers = {
    handleFocus: (event: Event) => this.onFocus(event),
    handleBlur: (event: Event) => this.onBlur(event),
    handleInput: (event: Event) => this.onInput(event),
    handleCompositionStart: () => this.clearPauseTimer(),
    handleCompositionEnd: () => this.restartInactivityTimers(),
    handleSelectionChange: () => this.onSelectionChange(),
  } as const;

  /**
   * Create a TypingObserver.
   * @param target Element or CSS selector for the editable element.
   * @param options Optional timing/behavior overrides.
   */
  constructor(
    target: EditableTarget | string,
    options: TypingObserverOptions = {}
  ) {
    const element =
      typeof target === "string"
        ? (document.querySelector(target) as EditableTarget | null)
        : target;
    if (!element) throw new Error("TypingObserver: target not found");

    this.element = element;
    this.options = {
      pauseDelay: options.pauseDelay ?? 1000,
      stopDelay: options.stopDelay ?? 2000,
      trackSelection: options.trackSelection ?? true,
    };

    this.attachListeners();
  }

  /**
   * Subscribe to a specific event.
   * @returns Unsubscribe function to remove the listener.
   */
  on<E extends keyof TypingObserverEventMap>(
    eventName: E,
    listener: Listener<E>
  ): () => void {
    return this.emitter.on(eventName, listener);
  }

  /** Remove a specific listener. */
  off<E extends keyof TypingObserverEventMap>(
    eventName: E,
    listener: Listener<E>
  ): void {
    this.emitter.off(eventName, listener);
  }

  /** Stop observing and clean up all timers and listeners. */
  destroy(): void {
    this.detachListeners();
    this.clearAllTimers();
    this.emitter.clear();
  }

  /** Get the latest snapshot of the element (value, selection, etc.). */
  current(): BaseTypingEvent {
    return createSnapshot(this.element);
  }

  /**
   * Indicate programmatic value change and refresh timers.
   * Example: after setting element.value via script.
   */
  bump(): void {
    this.onInput(new Event("input"));
  }

  // ----- Private: DOM listener lifecycle -----

  private attachListeners(): void {
    const el = this.element;
    el.addEventListener("focus", this.boundHandlers.handleFocus, true);
    el.addEventListener("blur", this.boundHandlers.handleBlur, true);
    el.addEventListener("input", this.boundHandlers.handleInput, true);
    el.addEventListener(
      "compositionstart",
      this.boundHandlers.handleCompositionStart,
      true
    );
    el.addEventListener(
      "compositionend",
      this.boundHandlers.handleCompositionEnd,
      true
    );

    if (this.options.trackSelection) {
      document.addEventListener(
        "selectionchange",
        this.boundHandlers.handleSelectionChange,
        true
      );
    }
  }

  private detachListeners(): void {
    const el = this.element;
    el.removeEventListener("focus", this.boundHandlers.handleFocus, true);
    el.removeEventListener("blur", this.boundHandlers.handleBlur, true);
    el.removeEventListener("input", this.boundHandlers.handleInput, true);
    el.removeEventListener(
      "compositionstart",
      this.boundHandlers.handleCompositionStart,
      true
    );
    el.removeEventListener(
      "compositionend",
      this.boundHandlers.handleCompositionEnd,
      true
    );
    document.removeEventListener(
      "selectionchange",
      this.boundHandlers.handleSelectionChange,
      true
    );
  }

  // ----- Private: Event handlers -----

  /** Handle focus gains on the observed element. */
  private onFocus(_event: Event): void {
    this.isFocused = true;
    this.emitter.emit(TypingObserverEvent.Focus, createSnapshot(this.element));
  }

  /** Handle focus loss on the observed element. */
  private onBlur(_event: Event): void {
    this.isFocused = false;
    this.emitStop();
    this.emitter.emit(TypingObserverEvent.Blur, createSnapshot(this.element));
  }

  /** Handle input mutations (keystrokes, paste, programmatic updates). */
  private onInput(_event: Event): void {
    if (!this.hasTypedSinceFocus) {
      this.hasTypedSinceFocus = true;
      this.emitter.emit(
        TypingObserverEvent.TypingStart,
        createSnapshot(this.element)
      );
    }
    this.emitter.emit(TypingObserverEvent.Typing, createSnapshot(this.element));
    this.restartInactivityTimers();
  }

  /**
   * Treat selection changes inside the element as activity (keeps timers fresh).
   * Only when focused and the selection belongs to the observed element.
   */
  private onSelectionChange(): void {
    if (!this.isFocused) return;
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!this.element.contains(range.startContainer)) return;
    this.clearPauseTimer();
    this.startPauseTimer();
    this.startStopTimer();
  }

  // ----- Private: Timer control -----

  /** Clear any active pause/stop timers, then restart both. */
  private restartInactivityTimers(): void {
    this.clearAllTimers();
    this.startPauseTimer();
    this.startStopTimer();
  }

  /** Start (or restart) the pause timer. */
  private startPauseTimer(): void {
    this.pauseTimerId = window.setTimeout(() => {
      if (this.isFocused)
        this.emitter.emit(
          TypingObserverEvent.TypingPause,
          createSnapshot(this.element)
        );
    }, this.options.pauseDelay);
  }

  /** Start (or restart) the stop timer. */
  private startStopTimer(): void {
    this.stopTimerId = window.setTimeout(
      () => this.emitStop(),
      this.options.stopDelay
    );
  }

  /** Emit the terminal stop event and reset typing state. */
  private emitStop(): void {
    if (this.hasTypedSinceFocus)
      this.emitter.emit(
        TypingObserverEvent.TypingStop,
        createSnapshot(this.element)
      );
    this.hasTypedSinceFocus = false;
    this.clearAllTimers();
  }

  /** Cancel both pause and stop timers. */
  private clearAllTimers(): void {
    if (this.pauseTimerId !== null) {
      clearTimeout(this.pauseTimerId);
      this.pauseTimerId = null;
    }
    if (this.stopTimerId !== null) {
      clearTimeout(this.stopTimerId);
      this.stopTimerId = null;
    }
  }

  /** Cancel only the pause timer. */
  private clearPauseTimer(): void {
    if (this.pauseTimerId !== null) {
      clearTimeout(this.pauseTimerId);
      this.pauseTimerId = null;
    }
  }
}

/**
 * Convenience factory.
 * @example
 *   const observer = observeTyping("#message", { pauseDelay: 700 });
 */
export function observeTyping(
  target: EditableTarget | string,
  options?: TypingObserverOptions
): TypingObserver {
  return new TypingObserver(target, options);
}
export * from "@/interactions/typingObserver/TypingObserver";
