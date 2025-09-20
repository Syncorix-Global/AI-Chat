import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, "src/$1") },
      { find: /^@interactions\/(.*)$/, replacement: path.resolve(__dirname, "src/interactions/$1") },
      { find: /^@typingObserver\/(.*)$/, replacement: path.resolve(__dirname, "src/interactions/typingObserver/$1") },
      { find: /^@tests\/(.*)$/, replacement: path.resolve(__dirname, "tests/$1") }
    ]
  }
});
