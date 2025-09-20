import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  target: "es2020",
  external: ["react"] // remove if not using React
});