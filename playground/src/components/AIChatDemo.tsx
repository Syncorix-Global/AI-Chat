import React from "react";
import { AIChatSocket } from "@sockets/AIChatSockets"; // use singular if your file is singular
import type { ChatID, UserID } from "@sockets/ChatEvents";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;
const CHAT_ID = (import.meta.env.VITE_CHAT_ID as ChatID) ?? "room-1";
const USER_ID = (import.meta.env.VITE_USER_ID as UserID) ?? "user-1";

export function AIChatDemo() {
  const [connected, setConnected] = React.useState(false);
  const [presence, setPresence] = React.useState<UserID[]>([]);
  const [processing, setProcessing] = React.useState<string>("");
  const [stream, setStream] = React.useState("");
  const [messages, setMessages] = React.useState<
    Array<{ id: string; role: "user" | "assistant"; text: string }>
  >([]);
  const [input, setInput] = React.useState("");

  const chatRef = React.useRef<AIChatSocket | null>(null);

  React.useEffect(() => {
    let buffer = "";

    const chat = new AIChatSocket({
      url: SOCKET_URL,
      chatId: CHAT_ID,
      callbacks: {
        onConnect: () => setConnected(true),
        onDisconnect: () => setConnected(false),
        onPresenceUpdate: (evt) => setPresence(evt.onlineUserIds),
        onAIProcessing: (evt) => {
          setProcessing(evt.status + (evt.etaMs ? ` (eta ${evt.etaMs}ms)` : ""));
          if (evt.status === "queued" || evt.status === "working") {
            buffer = "";
            setStream("");
          }
        },
        onAIToken: (evt) => {
          buffer += evt.token;
          setStream(buffer);
        },
        onAIMessage: (evt) => {
          setMessages((m) => [...m, { id: evt.messageId, role: "assistant", text: evt.text }]);
          buffer = "";
          setStream("");
          setProcessing("");
        },
        onAIError: (evt) => {
          setProcessing("");
          setStream("");
          console.error("AI error:", evt.code, evt.message);
        },
        onChatMessage: (evt) => {
          setMessages((m) => [...m, { id: evt.messageId, role: "user", text: evt.text }]);
        }
      },
      autoConnect: true
    });

    chatRef.current = chat;
    return () => {
      chat.disconnect();
      chatRef.current = null;
    };
  }, []);

  const send = () => {
    if (!input.trim() || !chatRef.current) return;
    const id = crypto.randomUUID();
    setMessages((m) => [...m, { id, role: "user", text: input }]);
    chatRef.current.sendMessage({ messageId: id, userId: USER_ID, text: input });
    setInput("");
  };

  const abort = () => chatRef.current?.abort("user-cancel");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 880, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>AI Chat Playground</h2>
        <span>{connected ? "🟢 Connected" : "🔴 Disconnected"}</span>
      </header>

      <div style={{ color: "#666", marginTop: 4 }}>
        Room: <code>{String(CHAT_ID)}</code> · You: <code>{String(USER_ID)}</code>
      </div>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ margin: "6px 0" }}>
            <strong>{m.role === "user" ? "You" : "Assistant"}:</strong> {m.text}
          </div>
        ))}
        {stream && (
          <div style={{ margin: "6px 0", opacity: 0.9 }}>
            <strong>Assistant (streaming):</strong> {stream}
          </div>
        )}
        {processing && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Status: {processing}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => chatRef.current?.typingStart(USER_ID)}
          onBlur={() => chatRef.current?.typingStop(USER_ID)}
          placeholder="Ask something..."
          style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button onClick={send}>Send</button>
        <button onClick={abort} disabled={!stream && !processing}>
          Abort
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
        Presence: {presence.length ? presence.join(", ") : "—"}
      </div>
    </div>
  );
}
