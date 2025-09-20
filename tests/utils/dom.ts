// tests/utils/dom.ts
// Small helpers for JSDOM-based tests.

export function createInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  document.body.appendChild(input);
  return input;
}

export function focus(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
}

export function blur(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}

export function typeText(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
