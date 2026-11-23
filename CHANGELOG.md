# Changelog

## 1.2.0 (2026-11-22)

### Added

- Light themes: Asm8 Light (meets WCAG 4.5:1 for text and every syntax colour), Catppuccin Latte and GitHub Light.
- The theme setting is a dropdown grouped into Dark and Light; the quick theme picker shows the same groups.
- Drag the edges to resize the side bar and the Machine panel, like the bottom panel. Arrow keys and Home/End work on a focused edge, and a double click restores the default size.
- The About dialog credits the fork author, with links to the website, GitHub, LinkedIn, Instagram, YouTube and X.

### Fixed

- Scrollbars and native controls follow the theme instead of always being dark.

## 1.1.0 (2026-11-12)

### Added

- Spanish translation of the whole interface, the console, assembler and runtime messages, and the documentation. The language follows the browser and can be changed in Settings → Appearance → Language.
- Richer instruction reference: 2–3 runnable examples and notes for every instruction, plus a guide covering registers and flags, numbers and characters, addressing modes, the memory map, input and output, and labels.
- Three new example programs: `print-string.asm`, `count.asm` and `subroutines.asm`. The guide lists every example and opens it in the editor.

### Fixed

- Phone: open files can be closed, and Settings and reference pages have a back button to the editor.
- Phone: the line being edited stays visible above the on-screen keyboard.
- Settings search shows a message when nothing matches.
- The SHR and DIV docs said they set the carry flag; they clear it.
- Console and status text no longer mention a keyboard port: IN and OUT take only a register.

## 1.0.0 (2026-11-12)

First release of Asm8: TypeScript core with legacy parity, Web Worker runner, CodeMirror editor, debugger, machine view, unlimited console with IN/OUT, folder and browser workspaces, offline PWA, seven themes, desktop/tablet/phone layouts.
