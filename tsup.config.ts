import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    // Root export: @syncorix/consultation
    index: "src/index.ts",
    // Subpath export: @syncorix/consultation/typing-observer
    "typing-observer": "src/interactions/typingObserver/TypingObserver.ts",
    "sockets": "src/sockets/index.ts"
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false, // keep single-file outputs per entry for simpler exports
  target: "es2020",
  tsconfig: "tsconfig.json"
});
