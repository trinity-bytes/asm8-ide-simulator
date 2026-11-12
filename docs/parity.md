# Parity with the legacy simulator

`tests/unit/parity.test.ts` loads the original `legacy/src` services in Node and compares them with
the Asm8 core: the hello world example, 400 random programs (state compared after every step) and the
legacy error messages.

## Intentional differences

| Area | Legacy | Asm8 |
| --- | --- | --- |
| Errors | Stops at the first error | Reports every line, plus warnings and quick fixes |
| Duplicate labels | Never detected (the check used an empty map) | `Duplicate label: x`, case-insensitive |
| Missing operand (`MOV A`, `INC`) | JavaScript `TypeError` | `MOV: missing operand` |
| Characters above 255 in strings | Stored as is (not a byte) | `Character must have a code between 0-255` |
| Text after an instruction (`MOV A, 1 junk`) | Silently ignored | Warning `Unexpected text after instruction` |
| `SUB reg, SP` | Subtracted `undefined` (read `gpr[4]`) | Subtracts SP |
| `NOT 0xFF` and other results of −256 | Register held 256 | Wraps to 0 (carry set) |
| Unused label | — | Warning `Label "x" is never used` |
| `IN reg` / `OUT reg` | — | New opcodes 98 / 99: keyboard input and console output |
