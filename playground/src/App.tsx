import React from "react";
import { AIChatDemo } from "./components/AIChatDemo";
import { TypingObserverDemo } from "./components/TypingObserverDemo";

export function App() {
  const [tab, setTab] = React.useState<"chat" | "typing">("chat");
  const Tab = tab === "chat" ? AIChatDemo : TypingObserverDemo;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#e5e7eb", background: "#0b0f14", minHeight: "100vh" }}>
      <header style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1f2430" }}>
        <strong>Playground</strong>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setTab("chat")} style={btn(tab === "chat")}>AI Chat</button>
          <button onClick={() => setTab("typing")} style={btn(tab === "typing")}>TypingObserver</button>
        </nav>
      </header>
      <main style={{ maxWidth: 960, margin: "0 auto" }}>
        <Tab />
      </main>
    </div>
  );
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #2a2f3a",
    background: active ? "#1f2937" : "transparent",
    color: "#e5e7eb",
    cursor: "pointer",
  };
}
