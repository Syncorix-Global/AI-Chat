/* eslint config for TypeScript library + Node + optional React playground */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    es2023: true,
    node: true,
    browser: true
  },
  ignorePatterns: [
    'dist/',
    'docs/',
    'mock-server/',
    'playground/',
    '**/*.d.ts'
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
