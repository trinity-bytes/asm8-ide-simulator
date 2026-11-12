# Asm8 — UI design (Figma)
Objective: design the whole Asm8 IDE (own modern version of this assembler simulator) in Figma before any code: every screen, modal and menu, desktop/tablet/phone, then a UI/UX audit loop.
Branch: none yet (design only, nothing committed) · delivery: ask-on-risk · runner: Figma screenshots + taste-skill critique (no code tests yet).

## Specs

User requests are quoted verbatim (Spanish, typos kept). Assumptions are marked as such.

- **S1 Product.** "quiero hacer mi proppia version del simulador de assembler, con tecnologia actual, interfaz tipo editor de codigo y nuevas funciones". Name: Asm8 ("respecto al nombre me oarece bien").
- **S2 Code-editor UI.** "me gustaria que la interfaz sea de editor de codigo tipo vscode, aogo moderno". "en ek general modernizaelo".
- **S3 Output.** "mejorar las capacidades de output que tiene, actualmente solo puede mostrar un output limitado". Today output is 24 memory-mapped bytes (0xE8–0xFF); the design replaces it with an unlimited, scrolling console.
- **S4 Themes.** "como cuaoquier editor de codigo creo que deberia poder permitir seoeccionar temas, fijo tiene que tener: catppuccin, tokio night, monokai, drscula, aura theme y one daek". "esta bien quebrespetes los temas, el tema oor defecto ya ed bueno con contrastes y eso" → keep each theme's original colors even when contrast is low; the default (Asm8 Dark) must meet contrast.
- **S5 Keyboard input.** "me encanta lo de permitir el ingreso por teclado, creo que debe ir en la consola/terminal para que se sienta natural".
- **S6 Installable app with local files.** "quierocque edta sea una app instalable y capaz de trabajar con srchivos locales, lectura, editar  guarar etc."
- **S7 Remaining screens.** "terminar de diselar el resto de pantallas o modales que abran los diferentes botones".
- **S8 Tablet and phone.** "quiero que tsmbien hayan vistas tablet y movil".
- **S9 Audit loop.** "cuando finalices audites la interfaz oara oulir la ui ux y aoliques lasncorrecciones en loop hasta obtener un resultado solido". Assumption for "solid": a full audit round finds no blocker or major issue on any screen, at desktop, tablet and phone, in Asm8 Dark plus a spot check of two other themes.

## Backlog (future features, not in this design round)

- **F1 Diff view for "Compare".** When a file changes on disk, "Compare" opens a side-by-side diff (disk vs editor) with Keep mine / Load from disk per hunk. Today only the button exists (`26:4930`). User decision 2026-11-12 (L21).
- **F2 More tablet and phone screens.** The user sees screens missing on tablet and phone (overlays, settings, search, files flows at those sizes); fine for now (L21).

## Tasks

| ID | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- |
| T1 | S1 S2 S3 | inline | done | Frame `2:19` IDE — Halted after run |
| T2 | S2 S3 S5 | inline | done | Frames `12:258` Running, `12:1306` Paused, `12:2355` Error, `12:3390` Waiting for input |
| T3 | S4 | inline | done | 7 modes in "Asm8 tokens"; theme clones `14:1282`…`14:5127`; picker `14:5896` |
| T4 | S7 | inline | done | Page "Components" `15:3074`: Icons `15:3075` (44), Button `18:3130`, Icon button `18:3163`, Pill `18:3183`, Toggle chip `18:3199`, Rail item `18:3223`, Editor tab `19:3153`, Panel tab `19:3186`, Explorer row `19:3253`, Register row `19:3273`, Flag cell `19:3286`, Console entry `21:3183`, Code line `21:3230`, Menu item `21:3258`, Text field `21:3284`, Toast `21:3307`, Dialog shell `21:3308` |
| T5 | S6 S7 | inline | done | Row "Files & app" (y=2400, 3400): Welcome `23:3074`, Browser asks access `25:3117`, Folder open + saved `25:3981`, Reopened allow access `25:5113`, Unsaved close `26:3779`, Changed on disk `26:4930`, Context menu + rename `26:6059`, Delete confirm `26:7241`, Install offer `29:7207`, Installed + About + offline `29:8362`, Browser fallback `29:9546` |
| T6 | S7 | inline | done | Row y=4400: Search `31:5923`, Run and debug (paused) `31:7136`, Instruction set (MOV) `32:6505`, Settings `32:7821`; new components Switch `30:5995`, Select `30:6016`, Segmented control `30:6038` |
| T7 | S7 | inline | done | Row y=5400: Speed dropdown `33:6882`, Command palette `33:8025`, Go to file `33:9192`, Keyboard shortcuts `33:10336`, Tab context menu `33:11640`, Hover MOV `34:8599`, Hover register A `34:9378`, Hover label `34:10161`, Quick fix `34:10941`, Memory cell popover `34:11719`, Reset + Undo `34:12512` |
| T8 | S3 S5 S7 | inline | done | Row y=6400: Problems `35:10166`, Display `35:10982`, Memory writes `35:11829`, Console Hex + wrap off `35:12680`, Machine Dec `36:11213`, Machine Bin + stack `36:12234` |
| T9 | S8 | inline | done | Landscape (y=7400): drawer closed `37:11725`, running + drawer open `37:12515`; portrait (y=8320): Console tab `37:13971`, Machine tab `37:14750`, Explorer sheet `37:15914` |
| T10 | S8 S5 | inline | done | Row y=9600: Code halted `40:12333`, paused `40:12528`, error `40:12746`, editing + accessory row `40:12950`, Machine running `41:12429`, Console waiting for input `41:13014`, Files `41:13275`, More `41:13548` |
| T11 | S4 | inline | done | 0 unbound colours in 45 new frames (scrims, browser prompt, system keyboard and fades excepted on purpose); palettes checked against official sources; theme spot checks row y=11000 `42:12886` `42:13052` `42:13824` `42:14704` `42:15467` `42:15551` |
| T13 | S7 S8 | inline | done | Phone long-press line actions `54:34764`; all non-phone frames swapped to component instances (tabs, explorer rows, registers, flags, console, panel tabs, toggles, rail, pill, title-bar buttons, code lines) |
| T12 | S9 | inline | done | 3 rounds; round 3: 0 contrast failures in 22 487 text nodes (Asm8 Dark, 52 frames), 0 touch targets under 40px on tablet/phone, worst-case frame `44:13647` passes |

### Inventory — what every button opens

**A. Components to extract first (T4).** Button (primary, secondary, disabled, icon-only), Tab (editor tab: active, inactive, unsaved; panel tab), Explorer row (file, folder, active, renaming), Register row, Flag cell, Console entry (asm, run, out, cpu, err, fix, tty), Pill, Toggle chip, Rail item, Menu item, Dialog shell. Memory cell already exists (`8:88`). Bind every fill to the "Asm8 tokens" variables.

**B. Files and installable app (T5, S6).**
- First run / no folder open: empty workbench with "Open folder", "New file", recent folders, examples.
- Open folder (system picker) → permission request → explorer filled with the user's real folder.
- Reopen after restart: "Allow access again to ~/asm" banner (permission must be granted again).
- Unsaved changes: dot on the tab; closing asks Save / Don't save / Cancel.
- File changed on disk while open: compare or reload.
- Save, Save as, Rename, New file, New folder, Delete (confirm naming the file), Duplicate: explorer context menu and inline rename.
- "Saved" toast and a status-bar save state.
- Install the app (prompt + "Installed" state) and an About sheet with the version.
- Offline indicator (works offline once installed).
- Browsers without folder access: fallback flow (open a single file, save as download). To verify before implementation: which browsers support the folder/file pickers today; read `npx modern-web-guidance retrieve install-web-app` and search again for file access.

**C. Rail views (T6).**
- Search: find and replace in the open folder, results grouped by file.
- Run and debug: breakpoints with conditions, watch list, call stack read from the stack bytes, step controls (Step, Step over CALL, Step out, Continue, Stop).
- Instruction set: searchable reference of every instruction, operand forms and opcode; "Insert" puts an example in the editor. Replaces today's separate `instruction-set.html`.
- Settings: font size, tab size, default speed, number base, theme (opens the picker), console scrollback, keyboard shortcuts.

**D. Menus, overlays, hovers (T7).**
- Speed dropdown (1, 4, 16, 64 Hz, Max).
- Command palette (Ctrl+Shift+P) and Go to file (Ctrl+P).
- Keyboard shortcuts sheet.
- Editor tab context menu (Close, Close others, Reveal in explorer).
- Hover cards: instruction docs on a mnemonic, address on a label, live value of a register while paused.
- Quick fix popover ("Did you mean MOV?").
- Memory cell popover: address, value in hex/dec/bin/char, edit while paused.
- Reset: immediate, with an "Undo" toast (no confirm dialog).

**E. Panel and Machine (T8).**
- Problems tab with several errors and warnings.
- Display tab: the 24-byte display (0xE8–0xFF) drawn as a screen.
- Memory writes tab: table of address, old, new, step, line.
- Console Hex view, Wrap off, Clear and the empty console.
- Machine in Dec and Bin; "changed since last step" marks; stack view.

**F. Tablet (T9).** 1180×820 landscape and 820×1180 portrait. Landscape: rail + editor + bottom panel; Machine as a right drawer. Portrait: editor on top, a tabbed bottom area (Console / Machine / Problems); Explorer as a sheet.

**G. Phone (T10).** 390×844. One region at a time: top bar with file name and Run/Step; bottom bar Code · Machine · Console · Files · More. Typing into the program happens in the Console view with the phone keyboard (S5). Editing: an accessory row above the keyboard with registers and common mnemonics. Halted, Running, Paused, Error and Waiting-for-input shown on the phone too.

### Design rules already decided (do not re-decide)

- Style: taste-skill app style `data-terminal`, dark, seed 295777469 (sheet: `.taste-skill/app/direction.json`). Reprint with `node ~/.claude-alt/skills/design-taste-frontend/scripts/draw.mjs --show` from the repo root.
- Type: Public Sans for interface text; JetBrains Mono for code and every number.
- The only accent: a 1px line under or beside the selected thing. Primary action = white pill with dark label.
- Colors only from variables in collection "Asm8 tokens" (`VariableCollectionId:2:2`). Modes: Asm8 Dark `2:0`, Catppuccin Mocha `10:0`, Tokyo Night `10:1`, Monokai `10:2`, Dracula `10:3`, Aura Dark `10:4`, One Dark `10:5`. A theme preview is a clone plus `setExplicitVariableModeForCollection`.
- Data on screens comes from the real simulator (snippet below). New instructions `IN`/`OUT` are a proposal with opcodes 98/99; their bytes are not real output.

### Figma reference

- File: https://www.figma.com/design/AEIM1D4pIPkAoulrRZCXgg (team trinitycorp, plan `team::1506772803868682613`), page "IDE redesign". Rows: "States" at y=0 and "Themes" at y=1160; each frame is 1440×900, placed 1540px apart.
- Plugin gotchas learned: an empty auto-layout spacer defaults to 100px tall (set height 1); `resize()` switches sizing to FIXED, so set `primaryAxisSizingMode='AUTO'` again on hugging tabs; screenshots scaled under 1440 make muted text look darker than it is.

### Real-data snippet (headless run of the current simulator)

```js
// node run.js from the repo root; prints labels, mapping, registers and memory after HLT
const fs=require('fs'),vm=require('vm');const reg={};
const app={service:(n,a)=>{const f=a[a.length-1];reg[n]=f(...a.slice(0,-1).map(d=>reg[d]));}};
const ctx=vm.createContext({app,console,angular:{isNumber:x=>typeof x==='number'}});
for(const f of ['src/emulator/opcodes.js','src/emulator/memory.js','src/emulator/cpu.js','src/assembler/asm.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const code=vm.runInNewContext(fs.readFileSync('src/ui/controller.js','utf8').match(/\$scope\.code = (".*");/)[1]);
const {cpu,memory,assembler}=reg;cpu.reset();memory.reset();
const out=assembler.go(code);out.code.forEach((b,i)=>memory.data[i]=b);
let steps=0;while(steps<5000){steps++;if(!cpu.step())break;}
console.log(JSON.stringify({labels:out.labels,mapping:out.mapping,steps,gpr:cpu.gpr,sp:cpu.sp,ip:cpu.ip,z:cpu.zero,c:cpu.carry}));
```

### Audit protocol (T12, S9)

Each round, on every frame (desktop, tablet, phone; Asm8 Dark plus two themes):
1. Screenshot every frame at full size.
2. Critique with `design-taste-frontend` (`references/app-screens.md` §2.7, the seven questions), `impeccable` (critique and audit), `improve-ui`, `break-ui` (worst cases: 500-line file, very long file and label names, thousands of console lines, many problems, empty folder) and `fixing-accessibility` (4.5:1 in Asm8 Dark, visible focus, keyboard order, names for icon buttons).
3. Write the findings as a table: frame, issue, severity (blocker / major / minor), fix.
4. Apply every blocker and major fix in Figma, then screenshot again.
5. Repeat. Stop when a round finds no blocker or major issue. Minor findings go into the Log for the user to decide.

## Log

- **L1 (2026-11-12, user, original request):** "quiero hacer mi proppia version del simulador de assembler, con tecnologia actual, interfaz tipo editor de codigo y nuevas funciones. para empezar me gustaria un rediseño de ui ennfigma trinitycorp. pero antes quiero que acrualices la skill de vuenas practicas npx modern-web-guidance@latest update"
- **L2 (user):** "para em9ezar me gustaria que la interfaz sea de editor de codigo tipo vscode, aogo moderno. otra cosa es mejorar las capacidades de output que tiene, actualmente solo puede mostrar un output limitado. y ek general modernizaelo. en inspiration garden, si es que mecesiras una api key te oa piedo dar, ese proyexto es mio y es seguro que te las pase porque las puedo fenerar y eliminar facilmente"
- **L3 (user):** "me encanta la direccion. resoecto al nombre me oarece bien. como cuaoquier editor de codigo creo que deberia poder permitir seoeccionar temas, fijo tiene que tener: catppuccin, tokio night, monokai, drscula, aura theme y one daek. me encanta lo de permitir el ingreso por teclado, creo que debe ir en la consola/terminal para que se sienta natural. continua con los estados"
- **L4 (user):** "me encanta, y esta bien quebrespetes los temas, el tema oor defecto ya ed bueno con contrastes y eso. otra cosa que debes tener en cuenta es que quierocque edta sea una app instalable y capaz de trabajar con srchivos locales, lectura, editar  guarar etc. ahora lo que quiero que hagas es que dejes t9do listo para oa siguiente sesion, terminar de diselar el resto de pantallas o modales que abran los diferentes botones  quiero que tsmbien hayan vistas tablet y movil. y oara que cuando finalices audites la interfaz oara oulir la ui ux y aoliques lasncorrecciones en loop hasta obtener un resultado solido"
- **L5 (evidence):** modern-web-guidance skill installed globally in `~/.agents/skills` (Claude Code symlink in `~/.claude/skills`); `chrome-extensions` came with it.
- **L6 (evidence):** T1–T3 built and screenshot-checked. Fixed during build: 100px spacers, collapsed tabs, flags width, legend overflow, breakpoint line (19 → 20), truncated IP labels. Theme palettes were entered from memory (Mocha, Night, Classic, Dark variants): verify in T11.
- **L7 (next step):** start T4 (components), then T5–T10 in order, then T12. Resume with this file plus the Engram topic `odd/asm8-ui-design/tasks`.
- **L8 (2026-11-12, user):** "dale, te dejo trabajando y vuelv9 en unas horas. confio enntu ceiterio para tomar oss decisiones importantes. al regresar quiero poder leer rapidamente que es lo que hiciste, decisiones y resultados"
- **L9 (T4 decisions):** components live on a new page "Components" (existing frames keep their detached copies; new screens use instances). Focus state = 2px accent ring (outside on pills, inner on tabs/rail), separate from the 1px selection line. Pill dot colours: Running positive, Paused warning, Waiting accent, Error negative, Halted/Ready muted. Added beyond Inventory A because later screens need them: Code line, Text field, Toast, Console kinds `warn` and `in`, 33 Lucide-geometry icons. Code line: put the indent in Gap (18 for labels, 84 for instructions), never in leading spaces. Plugin gotcha: `{...boundPaint, opacity}` drops the opacity; set it on a JSON copy of `node.fills` afterwards.
- **L10 (T5 evidence, 2026-11-12):** file access support checked (caniuse + MDN + Chrome docs via fetch): `showOpenFilePicker`/`showDirectoryPicker`/`showSaveFilePicker` only in Chromium desktop (Chrome/Edge 105+, Opera); not Safari, not Firefox; Chrome Android unclear. Stored handles need `requestPermission()` again after reload; Chrome 122+ offers "Allow on every visit" and installed apps keep access. Web Install API (`<install>` / `navigator.install()`) with `beforeinstallprompt` fallback (Chromium only); manifest install works in Safari 17+.
- **L11 (T5 decisions):** two storage modes. Chromium desktop = real folder ("Open folder"). Other browsers and phones = "Browser workspace" (OPFS) with Import files / Download, stated in an editor notice. Welcome hides the Machine panel until a program is open. Reopen without access shows the last saved copy read-only with "Allow access again" (Install keeps access). Delete uses a new Button style `Danger`, default focus on Cancel. Reset stays immediate with an Undo toast (Inventory D). Compare (diff view) on "changed on disk" is drawn as a button only; the diff screen is deferred, listed for the user.
- **L12 (gotchas):** cloning a variant inside a set drops its `componentPropertyReferences` (re-link after cloning); you cannot append into an instance (detach the Dialog shell for custom bodies); instance children cannot be rotated (swap the icon instead).
- **L13 (T6 decisions):** Instruction set = side-bar list grouped by purpose + a reference tab per instruction (forms, example, opcode, bytes, Insert); it replaces `instruction-set.html`. IN/OUT listed under Machine marked "new". Settings opens as an editor tab (VS Code pattern), sections Editor/Run/Machine/Console/Appearance/Keyboard, saved automatically. Debug view: toolbar Continue/Step/Step over/Step out/Restart/Stop, Watch, Call stack derived from stack bytes (return address 0x17), Breakpoints with condition and hit count, "Pause on runtime faults" switch. Opcode/bytes for MOV checked against `src/emulator/opcodes.js`.
- **L14 (T7/T8 evidence):** memory writes and steps come from a headless run that hooks `memory.store` (scratch script `writes.js`, not committed): 15 writes in 83 steps; CALL print writes 0x17 to 0xE7 at step 4, PUSH A/B at steps 5-6, then `MOV [D], A` (line 20) writes 'H'…'!' to 0xE8–0xF3 every 6 steps from step 9. Problems use the assembler's real messages (`Number must have a value between 0-255`); "label never used" is a new Asm8 warning.
- **L15 (T7/T8 decisions):** the number base switch changes registers, flags, watch and hover cards; the memory grid always stays hex (Dec/Bin/Char of a cell live in its popover) because 3-digit and 8-digit cells do not fit 16 columns. Stack view sits between Flags and Memory and names who pushed each byte. Speed menu adds a "Max" note (screen refresh every 100 ms). Wrap off clips long console lines with a right fade and a horizontal scrollbar.
- **L16 (T9/T10 decisions):** tablet uses touch sizes (56px title bar, 40px buttons, 44px panel tabs, 40px explorer rows). Landscape keeps the rail; Machine is a right drawer over the editor without a scrim so stepping stays possible; a "Machine" button toggles it (primary when open). Portrait drops the rail: a Files button opens the explorer as a left sheet, and the bottom area has tabs Console / Machine / Problems / Display. Phone: top bar (file, state line, Run/Pause/Continue, Step), one region at a time, bottom bar Code · Machine · Console · Files · More. Phone hides the address column. Paused shows a step bar (Step, Over, Out, Stop). Error shows a problem bar with "Fix: MOV". Editing shows an accessory row (Tab, A–D, [ ], comma, MOV, CMP, JMP, JNZ). Keyboard input (S5) lives in the Console view with a "Keys go to the program as you type" bar. Phones always use the browser workspace.
- **L17 (T11 evidence):** official palettes fetched (catppuccin/palette, folke/tokyonight.nvim night, draculatheme.com/spec, VS Code theme-monokai, aura-theme color-palettes, Atom one-dark-syntax): every token matches. One change: Monokai `syntax/comment` #75715e → #88846f, the value VS Code ships (the original Monokai value is #75715e). One Dark `muted` #9da5b4 is Atom's UI subtle text colour, kept.
- **L18 (T12 audit rounds, 2026-11-12):**

| Round | Frame | Issue | Severity | Fix |
| --- | --- | --- | --- | --- |
| 1 | Explorer rows (all file frames) | muted meta on active row 3.37:1 | major | Explorer row Active fill → `raised` (+ accent line) |
| 1 | Menus, search, call stack, problems | muted text on `control` highlight 3.37:1 | major | secondary text on highlighted rows → `text`; Menu item Highlighted shortcut → `text` |
| 1 | Panel — Display | empty cells drawn in `border` (1.13:1) | major | empty cells → `muted` |
| 1 | Phone — paused | comment on paused tint 4.40:1 | minor | tint 0.14 → 0.10 |
| 1 | Worst case | tab names cut to 8 chars | major | Editor tab: name hugs up to 180px, then ellipsis (component rule) |
| 1 | Worst case | "+6 more tabs" hidden by overflow | major | pinned to the tab bar's right edge |
| 1 | Worst case | wrapped console line: kind label centred | minor | entry aligns top |
| 1 | Worst case | status "Running" vs pill "Halted" | major | pill Running, Run → Pause |
| 2 | Theme picker (T3) | "Previewing" muted on control 3.37:1 | major | → `text` |
| 2 | Tablet drawer close, phone Hide | 32px / 36px targets | major | 40px |
| 3 | all | — | — | no blocker or major left |

- **L19 (minor findings left for the user):** (1) "Compare" on changed-on-disk has no diff screen yet. (2) Phone breakpoint slot is 18px wide; proposal: long-press the line number to toggle. (3) T1–T3 frames keep their original detached layers; new screens use component instances. (4) Instruction set list and Settings list run past the visible area (they scroll). (5) Worst-case frame keeps hello.asm values in the Machine panel. (6) Hover and focus states are drawn in Components, not on every screen.
- **L20 (next step):** user review of the design. Then decide the stack and start implementation planning (new feature document).
- **L21 (2026-11-12, user):** "sobre los detalles el pinto uno dejalo anotado como una feature a futuro y ellnresto si solucionalo. viendo el diselo me gudto pero veo quebtaltan pantallas en movil y tablet pero por ahora esta bien creo"
- **L22 (T13 decisions and evidence):** minor 1 → Backlog F1. Minor 2 → phone gutter: quick tap on the line number toggles the breakpoint; long-press opens a line action sheet (Add breakpoint, Breakpoint with condition…, Run to this line, Copy line); the slot + number + gap form one tap area of about 50px. Minor 3 → every repeated part outside the phone frames is now an instance (≈1 600 swaps in 54 frames, 0 errors after one retry). Two console lines stay detached on purpose (wrapped line in Worst case, clipped line in Hex/wrap off) because no variant covers them. Code line component now matches the approved desktop editor (18px rows, mono 12 gutter, 0xNN address, mono 13 source, Hint + Show hint properties); Register row Dec is right-aligned. Paused lines in 8 frames had a full-opacity warning fill after the swap; reset to the component's 0.14 tint. Gotcha: `node.screenshot()` from the plugin sometimes renders bound colours black; trust `get_screenshot`.
- **L23 (minor findings still open):** (4) Instruction set and Settings lists run past the visible area (they scroll). (5) Worst-case Machine panel keeps hello.asm values. (6) Hover/focus states live in Components, not on every screen. Phone frames keep hand-built rows (their structure differs from desktop components).
- **L24 (2026-11-12, user):** "seguimos con los detalles menores ennla siguiente sesion y luego lo del stack"
- **L25 (next session):** fix the open minors from L23 (4: Instruction set and Settings lists cut at the visible edge; 5: worst-case Machine panel still shows hello.asm values; 6: hover/focus states only in Components, add them to screens), re-run the contrast and touch audits, then choose the stack and open the implementation feature document.
- **L26 (2026-11-12, user):** "continuemosncon los detalles menores y luego vemos lo deonstack"
- **L27 (L23 minors fixed):** (4) 4px `color/control` scrollbar thumbs (radius 2, sized visible/content) on the Instruction set list and the Settings list (also the Tokyo Night theme check), so the cut reads as scrolling. (5) Worst-case Machine panel now matches its running keyboard-echo state: A 0x41 / B 0x01 (same as the last console tick), IP 0x9C, SP 0xE5 with 2 pushed bytes, Code 225 B + stack 2 + display 24 = the status bar's "251 of 256 bytes used", display shows echoed text; the stale "halted · 83 steps" hint is off. (6) New row "Interaction states" at y 13400: "States — Mouse hover" (explorer row, editor tab, rail, Step, Hex toggle, register C, Display tab, drawn together), "States — Keyboard focus and Tab order" (focus on Step + 14 numbered markers: Run, Step, Reset, Speed, rail, explorer, tabs, editor, panel tabs, console toggles, console input, base switch, registers, memory), "States — Tablet with keyboard". Phone frames keep hand-built rows (accepted). Contrast unchanged: only existing audited variants used; marker digits are `surface` on `accent`.
- **L28 (next step):** choose the stack and open the implementation feature document.
- **L29 (2026-11-12, user):** "vamos con svelte. por lo demss lo que sugieres me parece bien. pero  una duda nada mas, que problema seria si usasemos andular o vue modernos?"
- **L30 (stack decision):** PWA (no Electron/Tauri). Vite + TypeScript strict, Svelte 5, CodeMirror 6, CPU + assembler ported to a framework-free TS core run in a Web Worker (snapshot every 100 ms), `FileSystem` port with File System Access and OPFS adapters, `vite-plugin-pwa`, CSS variables generated from Figma "Asm8 tokens", Vitest (golden test: hello.asm halts after 83 steps) + Playwright, branch `feat/asm8` in this repo with old `src/` kept until parity. Vue 3 or modern Angular would also work (answered L29); Svelte chosen for the least code and the smallest bundle. Next: open the implementation feature document.

