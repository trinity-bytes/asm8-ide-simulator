# Asm8

Asm8 is an 8-bit assembler IDE and simulator that runs in the browser and installs as an app.
It is a modern rewrite of [Simple 8-bit Assembler Simulator](https://github.com/Schweigi/assembler-simulator)
by Marco Schweighauser (MIT). The original app lives in `legacy/` and is used by the parity tests.

## Features

- Code editor (CodeMirror 6): syntax colours, byte address of every line, breakpoints in the gutter,
  every problem underlined at once with quick fixes, hovers with instruction docs, label addresses and
  live register values, autocomplete.
- Run at 1, 4, 16 or 64 Hz or Max (the CPU runs in a Web Worker). Step, step over a CALL, step out,
  breakpoints with conditions (`A == 'H'`, `[D] != 0`) and hit counts, watch expressions, call stack
  read from the stack, Reset with Undo.
- Machine view: registers in hex, decimal or binary with "changed" marks, flags, stack with who pushed
  each byte, 256-byte memory map (edit a cell while paused), the 24-byte display and a log of every
  memory write.
- Unlimited console: program output (`OUT`), keyboard input typed in the console (`IN`), errors.
- Files: open a real folder (Chromium desktop, File System Access) or use the browser workspace
  (every browser, OPFS). New, rename, duplicate, delete with confirmation, unsaved-changes prompts,
  "changed on disk" detection, download and import.
- Installable PWA that works offline; installed on desktop Chromium, `.asm` files open in Asm8.
- Seven themes: Asm8 Dark (meets WCAG contrast), Catppuccin Mocha, Tokyo Night, Monokai, Dracula,
  Aura Dark, One Dark. Desktop, tablet and phone layouts.

### New instructions

| Instruction | Opcode | Meaning |
| --- | --- | --- |
| `IN reg` | 98 | Waits for a key typed in the console and stores its code in the register |
| `OUT reg` | 99 | Prints the register as a character in the console |

Differences from the original simulator are listed in [docs/parity.md](docs/parity.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (PWA) in `dist/` |
| `npm test` | Unit tests (Vitest, 2 workers) |
| `npm run check` | Type check (`svelte-check`) |
| `npm run lint` | ESLint |
| `npm run e2e` | Builds, then runs the end-to-end tests (Playwright, Chromium, 1 worker) |
| `node scripts/tokens.mjs` | Regenerates `src/ui/theme/tokens.css` from the Figma token export |

## Architecture

Hexagonal: dependencies point inward, the core knows nothing about the browser.

```
src/
  core/          Pure domain: instruction set, assembler, CPU, debugger rules. No DOM, no Svelte.
  application/   Use cases and ports (interfaces) the UI talks to: workspace, run session, settings.
  adapters/      Port implementations: File System Access, OPFS, IndexedDB, Web Worker runner, PWA.
  ui/            Svelte 5. atoms → molecules → organisms → screens; `state/` holds the containers,
                 `editor/` the CodeMirror integration, `theme/` the tokens. `App.svelte` is the
                 composition root (the only place that picks adapters).
```

Flow of a run: the UI calls `SessionState.run()` → it assembles with the core and sends commands
through the `RunnerPort` → the Web Worker hosts `RunLoop` (application), which drives the core
`Machine` + `Debugger` on a clock and posts snapshots back (every step, or every 100 ms at Max).

ESLint enforces the direction: `core` cannot import `application`, `adapters`, `ui` or Svelte;
`application` cannot import `adapters` or `ui`.
