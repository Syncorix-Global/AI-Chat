import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname, "../src/") },
      { find: /^@sockets\/(.*)$/, replacement: path.resolve(__dirname, "../src/sockets/$1") },
      { find: /^@typingObserver\/(.*)$/, replacement: path.resolve(__dirname, "../src/interactions/typingObserver/$1") }
    ]
  },
  server: {
    open: "/",
    port: 5173
    // If your Socket.IO server is at a different origin
    // you can proxy it here (optional):
    // proxy: {
    //   "/socket.io": {
    //     target: "https://realtime.example.com",
    //     changeOrigin: true,
    //     ws: true
    //   }
    // }
  }
});
