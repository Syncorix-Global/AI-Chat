import React from "react";
import { observeTyping, TypingObserverEvent } from "@typingObserver/TypingObserver";
// If you didn't add the alias, use relative: "../../../src/interactions/typingObserver/TypingObserver"

export function TypingObserverDemo() {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<{ label: string; color: string }>({
    label: "Idle",
    color: "#6b7280",
  });

  const write = (msg: string) => setLog((l) => [...l, msg].slice(-300));

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const observer = observeTyping(el, { pauseDelay: 700, stopDelay: 1400 });

    observer.on(TypingObserverEvent.Focus, () => { write("[Focus]"); setStatus({ label: "Focused", color: "#3b82f6" }); });
    observer.on(TypingObserverEvent.TypingStart, () => { write("[Start]"); setStatus({ label: "Typing…", color: "#10b981" }); });
    observer.on(TypingObserverEvent.Typing, (e) => { write(`[Typing] value="${e.value}"`); setStatus({ label: "Typing…", color: "#10b981" }); });
    observer.on(TypingObserverEvent.TypingPause, () => { write("[Pause]"); setStatus({ label: "Paused", color: "#f59e0b" }); });
    observer.on(TypingObserverEvent.TypingStop, () => { write("[Stop]"); setStatus({ label: "Stopped", color: "#ef4444" }); });
    observer.on(TypingObserverEvent.Blur, () => { write("[Blur]"); setStatus({ label: "Blurred", color: "#6b7280" }); });

    return () => observer.destroy();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>TypingObserver (React)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
        <div>
          <textarea
            ref={textareaRef}
            placeholder="Type here…"
            style={{ width: "100%", height: 120, padding: 10, borderRadius: 10, border: `2px solid ${status.color}` }}
          />
          <div style={{ fontSize: 12, color: "#9aa2af", marginTop: 4 }}>Visual cue + event log.</div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: "1px solid #2a2f3a", background: "#111827", color: "#e5e7eb" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: status.color }} />
          <span>{status.label}</span>
        </div>
      </div>

      <h4>Event log</h4>
      <pre style={{ background: "#0b0f14", color: "#c9d1d9", padding: 12, borderRadius: 8, maxHeight: 280, overflow: "auto" }}>
        {log.join("\n")}
      </pre>
    </div>
  );
}
