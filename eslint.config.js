// eslint.config.js (ESLint v9 flat config)
// Works with "type": "module" in package.json

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // Base TS rules (non type-aware, fast)
  ...tseslint.configs.recommended,

  // Project rules
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'dist/**',
      'docs/**',
      'node_modules/**',
      // keep playground in or out depending on preference:
      // comment out the next line if you want to lint the playground code too
      // 'playground/**',
      'mock-server/**'
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module'
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
);

/*
 * OPTIONAL: enable type-aware linting (slower)
 * 1) pnpm add -D typescript-eslint @typescript-eslint/parser
 * 2) uncomment below and ensure your tsconfig.json covers "src/**"
 */

// export default tseslint.config(
//   js.configs.recommended,
//   ...tseslint.configs.recommendedTypeChecked,
//   {
//     files: ['**/*.{ts,tsx}'],
//     languageOptions: {
//       parserOptions: {
//         projectService: true,       // use TS project service
//         tsconfigRootDir: import.meta.dirname
//       }
//     },
//     rules: {
//       // add any type-aware rules here
//     }
//   },
//   {
//     files: ['**/*.{js,jsx}'],
//     // JS-only rules if needed
//   },
//   {
//     ignores: ['dist/**', 'docs/**', 'node_modules/**', 'mock-server/**']
//   }
// );
