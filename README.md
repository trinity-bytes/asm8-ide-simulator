# Asm8

Asm8 is an 8-bit assembler IDE and simulator that runs in the browser and installs as an app.
It is a modern rewrite of [Simple 8-bit Assembler Simulator](https://github.com/Schweigi/assembler-simulator)
by Marco Schweighauser (MIT). The original app lives in `legacy/` and is used by the parity tests.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (PWA) in `dist/` |
| `npm test` | Unit tests (Vitest, 2 workers) |
| `npm run check` | Type check (`svelte-check`) |
| `npm run lint` | ESLint |
| `npm run e2e` | End-to-end tests (Playwright, Chromium, 1 worker) |

## Architecture

Hexagonal: dependencies point inward, the core knows nothing about the browser.

```
src/
  core/          Pure domain: instruction set, assembler, CPU, debugger rules. No DOM, no Svelte.
  application/   Use cases and ports (interfaces) the UI talks to: workspace, run session, settings.
  adapters/      Port implementations: File System Access, OPFS, IndexedDB, Web Worker runner, PWA.
  ui/            Svelte 5. atoms → molecules → organisms → screens; `state/` holds the containers.
```

ESLint enforces the direction: `core` cannot import `application`, `adapters`, `ui` or Svelte;
`application` cannot import `adapters` or `ui`.
