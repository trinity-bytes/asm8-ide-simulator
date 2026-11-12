# Asm8 — implementation
Objective: build Asm8, the installable PWA designed in `odd/tasks/asm8-ui-design.md` (Figma `AEIM1D4pIPkAoulrRZCXgg`), on a framework-free TypeScript core.
Branching: git-flow. `master` = releases, `develop` = integration, one `feature/<name>` per feature below, merged into `develop`; releases via `git flow release`. Chain strategy for features over ~400 changed lines: feature-branch-chain (the feature branch is the tracker). Delivery: ask-on-risk.
Runner: Vitest (core, adapters, components) + Playwright (e2e) + `svelte-check`.

## Specs

User requests are quoted verbatim (Spanish, typos kept). Assumptions are marked as such. Design specs S1–S9 live in `odd/tasks/asm8-ui-design.md` and apply here unchanged.

- **S1 Build the design.** Implement every screen of the Figma file at desktop, tablet and phone, in Asm8 Dark and the six themes (design S1–S9, Log L8–L27). Assumption: Figma frames are the acceptance reference; where code and Figma disagree, Figma wins unless a decision is logged here.
- **S2 Stack.** "vamos con svelte. por lo demss lo que sugieres me parece bien" (L1 below). Means: PWA (no Electron/Tauri), Vite + TypeScript strict, Svelte 5, CodeMirror 6, CPU + assembler ported to a framework-free TS core run in a Web Worker (snapshot every 100 ms), a `FileSystem` port with File System Access and OPFS adapters, `vite-plugin-pwa`, CSS variables generated from Figma "Asm8 tokens", Vitest + Playwright.
- **S3 Workflow.** "armalo en su propia rama con paradigma de inegracion de festure por rama, comventional commits full ingles y minuscila, y release con git-flow helper". Means: every feature on its own `feature/*` branch off `develop`; Conventional Commits, English only, all lowercase (type, scope and subject), e.g. `feat(core): add assembler label resolution`; releases with `git flow release start/finish`.
- **S4 Behavior parity.** Assumption: the new core assembles and runs every program exactly like the legacy simulator (same bytes, labels, mapping, registers, flags, memory, step count, and the same error messages such as `Number must have a value between 0-255`). Proof: differential tests that run the legacy `cpu.js`/`asm.js` and the new core on the same programs.
- **S5 New instructions.** IN/OUT with opcodes 98/99 (design Log L13, Figma memory note): keyboard input goes through the console as a terminal line (design S5), output goes to the unlimited console (design S3).
- **S6 Architecture.** Assumption (user expertise: Clean/Hexagonal/Screaming, atomic design, container-presentational): `src/core` has no browser or framework imports; ports in `src/application`, adapters in `src/adapters`; UI in `src/ui` split into atoms / molecules / organisms / screens, with containers holding state and presentational components holding markup.

## Features

Each row is one branch. Order follows dependencies; F3 and F4 can run in parallel after F2.

| ID | Branch | Specs | Scope | Risk | Forecast lines |
| --- | --- | --- | --- | --- | --- |
| F1 | `feature/scaffold` | S2 S3 S6 | Vite + Svelte 5 + TS strict, ESLint + Prettier + `svelte-check`, Vitest, Playwright, folder layout; move legacy app to `legacy/` with `git mv` (kept for parity tests) | item 5 (dependencies, tooling) | ~350 |
| F2 | `feature/core-assembler` | S4 S6 | Port `asm.js` to `src/core/assembler`: tokens, labels, mapping, errors with the legacy messages; differential tests vs `legacy/` | none | ~700 |
| F3 | `feature/core-cpu` | S4 S5 S6 | Port `cpu.js`, `memory.js`, `opcodes.js`; faults; IN/OUT 98/99; golden test hello.asm halts after 83 steps; differential tests | none | ~800 |
| F4 | `feature/theme-tokens` | S1 S2 | Export the 7 modes of "Asm8 tokens" to CSS variables; self-hosted Public Sans and JetBrains Mono (offline) | none | ~300 |
| F5 | `feature/runtime-worker` | S2 S5 | Web Worker runner: speeds incl. Max (100 ms snapshots), run/pause/step/over/out/reset, breakpoints with condition and hit count, pause on faults, memory-writes log, keyboard input buffer, unlimited console with 10 000-line view | item 4 (async ordering) | ~600 |
| F6 | `feature/ui-components` | S1 S6 | Atoms/molecules from the Components page: Button, Icon button, Toggle chip, Rail item, Editor tab, Panel tab, Explorer row, Register row, Text field, Switch, Select, Pill, Toast, Dialog, Menu, Memory cell, Console entry; hover/focus states (design L27) | none | ~900 |
| F7 | `feature/editor` | S1 S2 | CodeMirror 6: asm language, address gutter, breakpoints, inline hints, lint → Problems, hovers (instruction docs, label address, register value), quick fix, theme from CSS variables | none | ~700 |
| F8 | `feature/workbench-desktop` | S1 | Desktop layout: title bar, rail + side bar views (Explorer, Search, Run and debug, Instruction set, Settings), editor group, panel (Console, Problems, Display, Memory writes), Machine panel (registers, flags, stack view, memory grid, base switch), status bar | none | ~1 200 |
| F9 | `feature/workspace-files` | S1 (design S6) | `FileSystem` port; File System Access adapter (open folder, permission re-request, changed on disk); OPFS browser workspace (import, download); handles in IndexedDB; unsaved changes, rename, delete with confirm | item 1 (renames and deletes the user's real files) | ~800 |
| F10 | `feature/overlays` | S1 | Command palette, go to file, keyboard shortcuts, menus, speed dropdown, popovers, reset with undo toast, settings persistence | none | ~700 |
| F11 | `feature/pwa` | S1 (design S6) | Manifest, offline service worker, install offer (`navigator.install` with `beforeinstallprompt` fallback), About offline | item 5 (service worker caching, release) | ~250 |
| F12 | `feature/responsive` | S1 (design S8) | Tablet landscape/portrait and phone: drawers, sheets, bottom bar, accessory row, step bar, line action sheet | none | ~900 |
| F13 | `feature/e2e-audit` | S1 | Playwright flows per Figma section, axe accessibility, contrast check of Asm8 Dark, worst-case data | none | ~500 |
| R1 | `release/1.0.0` | S3 | `git flow release start 1.0.0`, version bump, changelog, finish into `master` + tag | item 5 | ~50 |

Forecast total ≈ 8 750 authored lines, so every feature above ~400 lines is delivered as a feature-branch chain: child PRs into the feature branch, then one PR from the feature branch into `develop`.

## Tasks

| ID | Feature | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| T1 | F1 | S2 S3 S6 | inline | pending | |
| T2 | F2 | S4 S6 | inline | pending | |
| T3 | F3 | S4 S5 S6 | inline | pending | |
| T4 | F4 | S1 S2 | inline | pending | |
| T5 | F5 | S2 S5 | inline | pending | |
| T6 | F6 | S1 S6 | inline | pending | |
| T7 | F7 | S1 S2 | inline | pending | |
| T8 | F8 | S1 | inline | pending | |
| T9 | F9 | S1 | inline | pending | |
| T10 | F10 | S1 | inline | pending | |
| T11 | F11 | S1 | inline | pending | |
| T12 | F12 | S1 | inline | pending | |
| T13 | F13 | S1 | inline | pending | |
| T14 | R1 | S3 | inline | pending | |

Route note: every task starts inline. A writer is delegated only for parallel independent units (candidates: F3 ∥ F4, F6 ∥ F7) or the long-session backstop; the choice and its reason are recorded here per task.

## Log

- **L1 (2026-11-12, user, original request):** "vamos con svelte. por lo demss lo que sugieres me parece bien. pero  una duda nada mas, que problema seria si usasemos andular o vue modernos?" — and then: "sale, armalo en su propia rama con paradigma de inegracion de festure por rama, comventional commits full ingles y minuscila, y release con git-flow helper que tengo que instalar me parece. menoasas el ocmando para instalarlo?"
- **L2 (decisions):** git-flow branches created locally: `develop` from `master`, plan on `feature/asm8-plan`. `git flow init` is left to the user after installing the helper (Debian package `git-flow` 1.12.3, AVH edition). Legacy app moves to `legacy/` in F1 so differential tests can load it. Repo attribution: no `Co-Authored-By` lines (user rule).
- **L3 (next step):** user installs git-flow and runs `git flow init -d`; then start T1 with `git flow feature start scaffold`.
