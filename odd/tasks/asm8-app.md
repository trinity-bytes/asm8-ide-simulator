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
| T1 | F1 | S2 S3 S6 | inline | done | c3976eb |
| T2 | F2 | S4 S6 | inline | done | d4493aa |
| T3 | F3 | S4 S5 S6 | inline | done | 2bef74a |
| T4 | F4 | S1 S2 | inline | done | 69f5cf8 |
| T5 | F5 | S2 S5 | inline | done | ebc5e04 |
| T6 | F6 | S1 S6 | inline | done | 5018331, f207b5f |
| T7 | F7 | S1 S2 | inline | done | f207b5f |
| T8 | F8 | S1 | inline | done | f207b5f |
| T9 | F9 | S1 | inline | done | 9aa5899, 81fcd14 |
| T10 | F10 | S1 | inline | done | f207b5f |
| T11 | F11 | S1 | inline | done | a7ed550 |
| T12 | F12 | S1 | inline | done | f207b5f, ec8ffed |
| T13 | F13 | S1 | inline | done | fed5e2a … dc97f49 |
| T14 | R1 | S3 | inline | pending | |

Route note: every task starts inline. A writer is delegated only for parallel independent units (candidates: F3 ∥ F4, F6 ∥ F7) or the long-session backstop; the choice and its reason are recorded here per task.

## Log

- **L1 (2026-11-12, user, original request):** "vamos con svelte. por lo demss lo que sugieres me parece bien. pero  una duda nada mas, que problema seria si usasemos andular o vue modernos?" — and then: "sale, armalo en su propia rama con paradigma de inegracion de festure por rama, comventional commits full ingles y minuscila, y release con git-flow helper que tengo que instalar me parece. menoasas el ocmando para instalarlo?"
- **L2 (decisions):** git-flow branches created locally: `develop` from `master`, plan on `feature/asm8-plan`. `git flow init` is left to the user after installing the helper (Debian package `git-flow` 1.12.3, AVH edition). Legacy app moves to `legacy/` in F1 so differential tests can load it. Repo attribution: no `Co-Authored-By` lines (user rule).
- **L3 (next step):** user installs git-flow and runs `git flow init -d`; then start T1 with `git flow feature start scaffold`.
- **L4 (2026-11-12, user):** "va, deja todo listo para arrancar la implementacion la sigukente sesion. btw tsmbien te hsbilite codegraph"
- **L5 (session prep, evidence):** git-flow 1.12.3 AVH installed and initialized (`master`, `develop`, prefixes `feature/` `bugfix/` `release/` `hotfix/` `support/`); version tag prefix set to `v` to match the existing tags `v0.2.2`…`v0.5.1`. Plan branch finished into `develop`. CodeGraph index present (`.codegraph/`, untracked). Toolchain: Node v26.12.1, npm 11.20.0 (pnpm has no version set in mise, bun missing) → use npm.
- **L6 (findings for T1–T3, from CodeGraph):**
  - `assets/asmsimulator.js` is a built bundle of `src/` (same `checkGPR`, `checkNoExtraArg` code). T1 moves it to `legacy/` too and excludes `legacy/` from lint and type checks.
  - Legacy quirk: `SUB reg, reg` reads `self.gpr[regFrom]` (`src/emulator/cpu.js:207`) instead of `getGPR_SP(regFrom)`, so `SUB A, SP` subtracts `undefined`. Open decision for T3: keep it bug-compatible for S4 or fix it and exclude that case from the differential test. Recommendation: fix it, log it as an intentional difference.
  - The legacy core loads through `app.service(...)` with Angular DI; the headless runner in `asm8-ui-design.md` ("Headless run" script) already shows how to load it in Node with `vm` — reuse it for the differential tests.
  - T1 adds `.codegraph/` to `.gitignore`. `.atl/` and `.taste-skill/` stay untracked until the user decides.
- **L7 (resume checklist, next session):** 1) read this document to the end of the Log; 2) `git switch develop && git flow feature start scaffold`; 3) T1 per F1 (Vite + Svelte 5 + TS strict, ESLint + Prettier + `svelte-check`, Vitest, Playwright, layout `src/core`, `src/application`, `src/adapters`, `src/ui/{atoms,molecules,organisms,screens}`, `git mv` legacy app to `legacy/`); commits in English, all lowercase; 4) `git flow feature finish scaffold` only after its checks pass, push stays the user's decision.
- **L8 (gotcha):** `git flow feature finish` writes the merge message `Merge branch 'feature/x' into develop`, which breaks S3. Right after each finish, while still local, run `git commit --amend -m "chore(git): merge feature/x into develop"` (release finish: reword its merge and tag messages the same way).
- **L9 (2026-11-12, user):** "procede con la implementacion por tu cuenta, resultado esperado es tener todo imolementado segunnel stack y lanarquitecrua interna elegida y las interfaces en figma. quiero una buena arquitectura interna. al finalizar la implementacion ve probando y auditando el codigo en loop gasta que obtengas una app web que puedas considersr solida. usa las skills y herramiemtss que sean necesarias, confio en tu criterio para oas decisiones poeque no te podre dar feeedback por algunas horas hastabque termines."
- **L10 (2026-11-12, user):** "una cosa mas y es que ao correr los test cuides de no llenar laemoria ram o sino se crashea la compu" → Vitest `pool: forks`, 2 workers; Playwright 1 worker, Chromium only; heavy commands run one at a time with `timeout`. Gotcha: never `pkill -f vitest` from a shell whose own command line contains "vitest" (it kills itself).
- **L11 (decisions, T1–T5):** feature branches are fast-forwarded when they hold one commit. Core keeps legacy semantics proven by `tests/unit/parity.test.ts` (hello world 83 steps, 400 random programs compared step by step, 14 legacy error messages); intentional differences listed in `docs/parity.md` (SUB reg,SP fix chosen per L6 recommendation, NOT 0xFF wraps, duplicate labels detected, missing operands reported, all-line diagnostics). Speeds 1/4/16/64 Hz + Max. Runner = pure `RunLoop` (application) hosted by a Web Worker adapter or inline. File System Access and OPFS share one adapter (`DirectoryFileSystem`); rename uses native `move()` or a byte-exact copy before delete (no data loss on partial failure).
- **L12 (UI decisions, T6–T12):** state containers are Svelte 5 rune classes in `src/ui/state` (`SessionState`, `WorkspaceState`, `SettingsState`, `UiState`) owned by `AppController`, the composition root wired in `App.svelte`; presentational atoms/molecules take props only. One `Workbench` screen covers desktop and both tablet layouts (rail + drawer in landscape, files sheet + Machine tab in portrait); `PhoneWorkbench` shows one region at a time. Run targets the last active file even while Settings or a reference tab is open. Settings hides the Machine panel (as in Figma). Phones always use the browser workspace (seeded with hello.asm). Ctrl+N/Ctrl+W cannot be captured in a browser tab, so New file is Alt+N and Close editor Alt+W. Compare (diff) stays disabled (backlog F1).
- **L13 (audit loop, 2026-11-12):**

| Round | Where | Issue | Severity | Fix |
| --- | --- | --- | --- | --- |
| e2e 1 | runner | Svelte proxies posted to the Worker (DataCloneError) | blocker | `$state.snapshot` before `postMessage` |
| e2e 1 | themes | duplicate keys on theme swatches crashed Settings and the picker | blocker | index keys |
| e2e 1 | errors | fault pointed at the next instruction | major | `faultAddress` in the snapshot |
| e2e 1 | a11y | register/memory names did not contain visible text; button nested in a tab | major | visible-text names; tab close is not a nested control (Delete/Alt+W) |
| review | files | folder rename fallback deleted hidden/uncounted files | blocker | copy the whole tree handle-to-handle, verify count before delete; case-only rename via temp name |
| review | files | switching workspace dropped unsaved edits; Save overwrote newer disk copy | major | Save/Don't save/Cancel before switching; stat before save |
| review | runtime | Restart did nothing while running; speed change before first tick paused the run; Stop broke Undo | major | single restart path; pending tick mode kept; `reset keepUndo:false` |
| visual 1 | tablet | quick steps reloaded the program (state only changed on worker reply) | major | optimistic `ready`/`running` state |
| visual 1 | desktop | memory empty before the first run; Run disabled on Settings | major | memory preview; `currentFile` |
| break-ui | console | Max-speed output froze the tab | blocker | batched immutable output, 16 KiB cap per update, 200/1000-row window (worst frame 50 ms) |
| break-ui | panels | long names hid problem messages and outline addresses | major | truncation, `Ln N` |
| keyboard | console | Tab trapped in the console input | blocker | Tab moves focus |
| final | all | — | — | 120 unit + 16 e2e (axe: 0 serious) pass, svelte-check 0, eslint 0 |

- **L14 (minor findings left):** (1) JS bundle 640 kB (206 kB gzip), precached for offline; code-splitting CodeMirror would speed the first visit. (2) The Problems list keeps line order (errors and warnings interleaved). (3) Compare / diff view (backlog F1). (4) Files opened from the OS (installed app) are copied into the browser workspace instead of edited in place. (5) The 7.5 k-line UI commit `f207b5f` was not split into ~400-line slices (autonomous run).
