# Asm8 — mobile fixes, Spanish translation, richer docs
Objective: fix two phone bugs (no way to close a file/settings; keyboard hides the edited line), add a Spanish translation and enrich the instruction-set documentation.
Branch: `feature/mobile-i18n-docs` (from `develop`) · delivery: ask-on-risk · runner: Vitest (`npm test`), Playwright (`npm run e2e`), `npm run check`, `npm run lint`.

## Specs

- **S1 Close on phone.** "al abrir un archivo o abrir los ajustes, no hay forma de cerrarlo o en el caso de ajustes no hay forma de salir de la pantalla de ajustes y regresar al editor." The phone Code region offers a visible control to close the open file and to leave Settings/reference pages back to the editor.
- **S2 Keyboard covers line.** "en el editor al seleccionar una linea en la parte inferior, se abre el teclado pero tapa la linea seleccionada porque no se scrollea a la altura del teclado." When the on-screen keyboard opens, the layout shrinks to the visible area and the cursor line is scrolled into view.
- **S3 Spanish.** "traduccion al español". Assumption: all UI text (menus, views, dialogs, toasts, settings, documentation, assembler/runtime messages) available in English and Spanish; default from the browser language, overridable in Settings.
- **S4 Richer docs.** "enriquecer la seccion de documentacion icluyendo mas data y mas ejemplos." The instruction-set reference gains more detail per instruction (more examples, notes) and general sections (registers, addressing, memory map, I/O). Assumption: content written in both languages. Example programs are not shown as code in the narrow side bar: they are listed in the Welcome examples and opened in the editor from the docs (L5).

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1 | inline | done | 933801f |
| T2 | S2 | inline | done | 933801f |
| T3a | S3 | inline — i18n core, language setting | done | e34dd42 |
| T3b | S3 | delegated (parallel) — state layer, toasts, commands, core messages | done | 8f19cd5 |
| T3c | S3 | delegated (parallel) — screens, top organisms, molecules, atoms | done | add499a |
| T3d | S3 | delegated (parallel) — panels, overlays, side views | done | 6f2a877 |
| T3e | S3 | delegated (parallel) — editor pages, Settings language row | done | a0d1715 |
| T4 | S3, S4 | delegated (parallel) — instruction docs, guide, Spanish docs | done | caa31bd |

## Log

- **L1 (2026-11-12, user, original request):** "hay dos cosas que fixear en movile: al abrir un archivo o abrir los ajustes, no hay forma de cerrarlo o en el caso de ajustes no hay forma de salir de la pantalla de ajustes y regresar al editor. lo segudno es que en el editor al seleccionar una linea en la parte inferior, se abre el teclado pero tapa la linea seleccionada porque no se scrollea a la altura del teclado. otros detalles que me gustaria añadir son: traduccion al español, y enriquecer la seccion de documentacion icluyendo mas data y mas ejemplos."
- **L2 (discovery):** `PhoneWorkbench.svelte` renders `EditorGroup showTabs={false}`, so the tab close button never shows and Settings/reference tabs have no exit. Viewport meta lacks `interactive-widget`, and `#app` is `100dvh`, so the keyboard overlays the editor instead of shrinking it.
- **L3 (T1/T2):** RED observed in `tests/e2e/phone.spec.ts` (no "Back to editor" button; active line at y=689 below scroller end 310), GREEN after fix. iOS `visualViewport` path not testable in Chromium emulation.
- **L4 (route):** T3b–T4 run as five parallel writers (Writer trigger (a): independent areas, each 100+ lines, disjoint surfaces; each owns `src/ui/i18n/messages/<area>.ts`). Parent owns git, `common.ts`, `i18n.svelte.ts`; seam check = full Vitest + Playwright + check + lint.
- **L5 (2026-11-12, user correction):** "los ejemplos de programas no estoy seguro si deban ir en la documetnacins, estaria mejor que aparezcan en la lista del menu inicial, o que en vez de mostrarse se los pueda seleccionar desde la documetnacion y que carguen en ek editor, porque la franja de espacio que habilita esa nabar derecha es muy corta para mstrar textos largos y codigo embebido"
- **L6 (close):** guide programs moved to `EXAMPLES` (print-string, count, subroutines; guide echo dropped as duplicate of keyboard-echo); docs list all examples as "Open {name} in the editor" buttons; Welcome shows translated titles. Parent also translated App toasts, file-system messages and hover docs. Checks: Vitest 168/168, Playwright 18/18, svelte-check 0, lint 0, prettier clean. Pre-existing flake: a11y "welcome" fails 3/4 on base too (offline toast measured mid-fade). Docs fix: SHR/DIV said C set on wrap; CPU never sets it. Risk: none (UI text; session snapshot/lastStop became getters, internal and covered by session tests).
