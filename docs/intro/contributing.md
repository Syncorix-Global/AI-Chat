---
title: Contributing
outline: deep
---

# Contributing

- Install: `pnpm i`
- Dev: `pnpm dev:all` (playground + mock server)
- Tests: `pnpm test`, watch with `pnpm test:watch`
- Build: `pnpm build`
- Docs: `pnpm docs:dev`

To release:
```bash
pnpm version patch|minor|major
git push && git push --tags
```
