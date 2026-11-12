import type { OperandKind } from './encodings';

/**
 * A parsed operand. `value` is a byte, a list of bytes (strings) or a label name that is
 * resolved after every line has been read.
 */
export type Operand =
  { kind: Exclude<OperandKind, 'numbers'>; value: number | string } | { kind: 'numbers'; value: number[] };

/** Raised for a problem on the current line; the assembler attaches the line number. */
export class AsmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AsmError';
  }
}

const NUMBER = /^[-+]?[0-9]+$/;
const LABEL = /^[.A-Za-z]\w*$/;

/** Allowed formats: 200, 200d, 0xA4, 0o48, 101b (same rules as the legacy simulator). */
export function parseNumber(input: string): number {
  if (input.slice(0, 2) === '0x') return parseInt(input.slice(2), 16);
  if (input.slice(0, 2) === '0o') return parseInt(input.slice(2), 8);
  if (input.endsWith('b')) return parseInt(input.slice(0, -1), 2);
  if (input.endsWith('d')) return parseInt(input.slice(0, -1), 10);
  if (NUMBER.test(input)) return parseInt(input, 10);
  throw new AsmError('Invalid number format');
}

const REGISTERS: Readonly<Record<string, number>> = { A: 0, B: 1, C: 2, D: 3, SP: 4 };

export function parseRegister(input: string): number | undefined {
  return REGISTERS[input.toUpperCase()];
}

/** `[B+3]`, `[SP-2]`: 5-bit two's-complement offset in the high bits, register in the low 3. */
export function parseOffsetAddressing(raw: string): number | undefined {
  const input = raw.toUpperCase();
  let base: number;
  if (input.startsWith('SP')) base = 4;
  else if (input[0] !== undefined && 'ABCD'.includes(input[0])) base = 'ABCD'.indexOf(input[0]);
  else return undefined;

  const start = base === 4 ? 2 : 1;
  const sign = input[start] === '-' ? -1 : input[start] === '+' ? 1 : 0;
  if (sign === 0) return undefined;

  let offset = sign * parseInt(input.slice(start + 1), 10);
  if (offset < -16 || offset > 15) throw new AsmError('offset must be a value between -16...+15');
  if (offset < 0) offset = 32 + offset;
  return offset * 8 + base;
}

export const isLabel = (input: string): boolean => LABEL.test(input);

function parseRegOrNumber(
  input: string,
  regKind: 'register' | 'regaddress',
  numKind: 'number' | 'address',
): Operand {
  const register = parseRegister(input);
  if (register !== undefined) return { kind: regKind, value: register };
  if (isLabel(input)) return { kind: numKind, value: input };

  if (regKind === 'regaddress') {
    const offset = parseOffsetAddressing(input);
    if (offset !== undefined) return { kind: regKind, value: offset };
  }

  const value = parseNumber(input);
  if (Number.isNaN(value)) throw new AsmError(`Not a ${numKind}: ${value}`);
  if (value < 0 || value > 255) throw new AsmError(`${numKind} must have a value between 0-255`);
  return { kind: numKind, value };
}

const charCode = (text: string, i: number): number => {
  const code = text.charCodeAt(i);
  if (code > 255) throw new AsmError('Character must have a code between 0-255');
  return code;
};

export function parseOperand(input: string): Operand {
  switch (input[0]) {
    case '[':
      return parseRegOrNumber(input.slice(1, -1), 'regaddress', 'address');
    case '"': {
      const text = input.slice(1, -1);
      return { kind: 'numbers', value: Array.from({ length: text.length }, (_, i) => charCode(text, i)) };
    }
    case "'": {
      const text = input.slice(1, -1);
      if (text.length > 1) throw new AsmError('Only one character is allowed. Use String instead');
      return { kind: 'number', value: charCode(text, 0) };
    }
    default:
      return parseRegOrNumber(input, 'register', 'number');
  }
}
