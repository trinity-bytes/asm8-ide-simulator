import { i18n, t, type MessageKey } from './i18n.svelte';

/**
 * English messages produced by `src/core` (assembler, operand parser, machine, debugger
 * conditions) mapped to message keys. The core stays English; the UI translates at display time.
 * Each pattern's named groups become the message parameters.
 */
const PATTERNS: readonly (readonly [RegExp, MessageKey])[] = [
  // Assembler
  [/^Label contains keyword: (?<name>.+)$/, 'state.core.labelKeyword'],
  [/^Duplicate label: (?<name>.+)$/, 'state.core.duplicateLabel'],
  [/^(?<instr>\S+): missing operand$/, 'state.core.missingOperand'],
  [/^(?<instr>\S+): too many arguments$/, 'state.core.tooManyArguments'],
  [/^(?<instr>\S+) does not support this operand$/, 'state.core.unsupportedOperand'],
  [/^(?<instr>\S+) does not support this operands$/, 'state.core.unsupportedOperands'],
  [/^Invalid instruction: (?<name>.+)$/, 'state.core.invalidInstruction'],
  [/^Did you mean (?<name>.+)\?$/, 'state.core.didYouMean'],
  [/^Unexpected text after instruction: (?<text>.+)$/, 'state.core.unexpectedText'],
  [/^Binary code does not fit into the memory\. Max (?<n>\d+) bytes are allowed$/, 'state.core.tooBig'],
  [/^Undefined label: (?<name>.+)$/, 'state.core.undefinedLabel'],
  [/^Label "(?<name>.+)" is never used$/, 'state.core.unusedLabel'],
  // Operands
  [/^Invalid number format$/, 'state.core.invalidNumberFormat'],
  [/^offset must be a value between -16\.\.\.\+15$/, 'state.core.offsetRange'],
  [/^Not a number: (?<value>.+)$/, 'state.core.notNumber'],
  [/^Not a address: (?<value>.+)$/, 'state.core.notAddress'],
  [/^number must have a value between 0-255$/, 'state.core.numberRange'],
  [/^address must have a value between 0-255$/, 'state.core.addressRange'],
  [/^Character must have a code between 0-255$/, 'state.core.charRange'],
  [/^Only one character is allowed\. Use String instead$/, 'state.core.oneChar'],
  // Machine
  [/^Memory access violation at (?<address>.+)$/, 'state.core.memoryViolation'],
  [/^FAULT\. Reset to continue\.$/, 'state.core.faultReset'],
  [/^Invalid register: (?<reg>.+)$/, 'state.core.invalidRegister'],
  [/^Stack overflow$/, 'state.core.stackOverflow'],
  [/^Stack underflow$/, 'state.core.stackUnderflow'],
  [/^IP outside memory$/, 'state.core.ipOutside'],
  [/^Division by 0$/, 'state.core.divisionByZero'],
  [/^Instruction pointer is outside of memory$/, 'state.core.ipOutsideMemory'],
  [/^Invalid op code: (?<code>.+)$/, 'state.core.invalidOpcode'],
  [/^No program loaded$/, 'state.core.noProgram'],
  // Breakpoint conditions
  [/^A character must look like 'H'$/, 'state.core.charLiteral'],
  [/^Unexpected "(?<token>.*)"$/, 'state.core.unexpected'],
  [/^Expected "(?<token>.*)"$/, 'state.core.expected'],
  [/^Condition is incomplete$/, 'state.core.incomplete'],
  [/^Unknown name: (?<name>.+)$/, 'state.core.unknownName'],
  [/^Condition is empty$/, 'state.core.empty'],
  // File and folder names, file system (application layer and adapters)
  [/^A name is required\.$/, 'state.core.fsNameRequired'],
  [/^This name is reserved\.$/, 'state.core.fsNameReserved'],
  [/^Names cannot contain /, 'state.core.fsNameChars'],
  [/^Names can be at most 120 characters\.$/, 'state.core.fsNameLength'],
  [/^"(?<name>.+)" already exists here\.$/, 'state.core.fsExistsHere'],
  [/^"(?<name>.+)" already exists$/, 'state.core.fsExists'],
  [/^(?:File )?not found: (?<path>.+)$/i, 'state.core.fsNotFound'],
  [/^Asm8 no longer has access to this folder\.$/, 'state.core.fsNoAccess'],
  [/^Could not copy every file of "(?<name>.+)"; nothing was deleted\.$/, 'state.core.fsCopyFailed'],
];

/**
 * A core message in the current locale. English, and any message without a pattern, come back
 * unchanged. Reads the reactive locale, so `$derived` callers re-translate when it changes.
 */
export function translateCoreMessage(message: string): string {
  if (i18n.locale === 'en') return message;
  for (const [re, key] of PATTERNS) {
    const m = re.exec(message);
    if (m) return t(key, m.groups ?? {});
  }
  return message;
}
