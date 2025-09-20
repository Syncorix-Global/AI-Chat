import { Server } from "socket.io";
import { createServer } from "http";
import { randomUUID } from "crypto";

const PORT = 4000;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // allow all for playground
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  // join event (expected by AIChatSocket)
  socket.on("chat:join", ({ chatId }) => {
    console.log("joined room", chatId);
    socket.join(chatId);

    // broadcast presence (toy logic)
    const onlineUserIds = Array.from(io.sockets.adapter.rooms.get(chatId) ?? []).map((id) => id);
    io.to(chatId).emit("presence:update", { chatId, onlineUserIds });
  });

  // user message
  socket.on("user:message", ({ chatId, userId, text }) => {
    console.log("user message:", userId, text);

    // echo it back as a chat:message
    io.to(chatId).emit("chat:message", {
      chatId,
      messageId: randomUUID(),
      userId,
      text,
      createdAt: new Date().toISOString()
    });

    // simulate AI pipeline
    simulateAIResponse(chatId);
  });

  socket.on("user:typingStart", ({ chatId, userId }) => {
    console.log("typing start", userId);
  });

  socket.on("user:typingStop", ({ chatId, userId }) => {
    console.log("typing stop", userId);
  });

  socket.on("ai:abort", ({ chatId, reason }) => {
    console.log("abort AI for", chatId, reason);
    // (not implemented: you'd cancel timers here)
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

function simulateAIResponse(chatId: string) {
  // send processing event
  io.to(chatId).emit("ai:processing", { chatId, status: "working", etaMs: 3000 });

  // stream 3 tokens
  const tokens = ["Hello", " there", "!"];
  tokens.forEach((tok, idx) => {
    setTimeout(() => {
      io.to(chatId).emit("ai:token", { chatId, token: tok, index: idx });
    }, 500 * (idx + 1));
  });

  // final message
  setTimeout(() => {
    io.to(chatId).emit("ai:message", {
      chatId,
      messageId: randomUUID(),
      role: "assistant",
      text: tokens.join(""),
      createdAt: new Date().toISOString()
    });
  }, 2000);
}

httpServer.listen(PORT, () => {
  console.log(`🚀 Mock server listening on http://localhost:${PORT}`);
});
