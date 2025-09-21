// ESLint v9 flat config
// - Ignores build outputs (dist, docs site assets)
// - Treats SDK & playground as browser code (so window/document/etc. are defined)
// - Treats mock server, scripts, and config as Node
// - Softens some TS rules to reduce CI noise

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // 0) Global ignores (never lint build outputs)
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "docs/**", // ignore the whole docs tree (incl. .vitepress/dist)
      "playground/dist/**",
      "tests/**",
      "mock-server/**",
      "eslintrc.cjs"
    ],
  },

  // 1) Base JS + TS recommendations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 2) Browser code (SDK + playground)
  {
    files: ["src/**/*.{ts,tsx,js,jsx}", "playground/src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // 3) Node code (mock server, scripts, configs)
  {
    files: [
      "mock-server/**/*.{ts,js}",
      "scripts/**/*.{ts,js}",
      "*.config.{ts,js,cjs,mjs}",
      "vitest.config.{ts,js,mjs,cjs}",
      "docs/.vitepress/config.{ts,js}",
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // 4) Tests (Vitest)
  {
    files: ["tests/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
        // vitest-style globals
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
