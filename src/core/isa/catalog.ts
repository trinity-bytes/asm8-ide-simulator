import { ENCODINGS } from '../assembler/encodings';

export type InstructionGroup =
  'Data' | 'Arithmetic' | 'Logic' | 'Compare and jump' | 'Stack and calls' | 'Machine';

export const GROUP_ORDER: readonly InstructionGroup[] = [
  'Data',
  'Arithmetic',
  'Logic',
  'Compare and jump',
  'Stack and calls',
  'Machine',
];

export interface InstructionForm {
  /** Operand pattern as shown to users, e.g. `reg, [address]`. */
  readonly operands: string;
  readonly opcode: number;
  readonly bytes: number;
}

export interface InstructionDoc {
  readonly mnemonic: string;
  readonly aliases: readonly string[];
  readonly group: InstructionGroup;
  readonly summary: string;
  readonly details: string;
  readonly flags: string;
  readonly example: string;
  /** True for instructions that the original simulator did not have. */
  readonly isNew?: boolean;
  readonly forms: readonly InstructionForm[];
}

const KIND_LABEL: Record<string, string> = {
  register: 'reg',
  regaddress: '[reg]',
  address: '[address]',
  number: 'value',
};

const formsOf = (mnemonic: string): InstructionForm[] => {
  const enc = ENCODINGS[mnemonic];
  if (!enc) return [];
  return Object.entries(enc.forms).map(([sig, opcode]) => ({
    operands:
      sig === ''
        ? ''
        : sig
            .split(',')
            .map((k) => KIND_LABEL[k] ?? k)
            .join(', '),
    opcode,
    bytes: 1 + enc.arity,
  }));
};

type Entry = Omit<InstructionDoc, 'forms'>;

const FLAGS_ARITH = 'Z if the result is 0. C if it went past 255 or below 0 (result wraps).';
const FLAGS_NONE = 'Unchanged.';

const ENTRIES: readonly Entry[] = [
  {
    mnemonic: 'MOV',
    aliases: [],
    group: 'Data',
    summary: 'Copy a value into a register or memory.',
    details:
      'The first operand is the destination, the second the source. Registers A–D and SP, an address, a register pointer [B] or [B+3], or a constant.',
    flags: FLAGS_NONE,
    example: 'MOV A, [0xE8]',
  },
  {
    mnemonic: 'DB',
    aliases: [],
    group: 'Data',
    summary: 'Define bytes: place a number, a character or a string in memory.',
    details: 'Not an instruction: the bytes are stored where the line is. Use a label to refer to them.',
    flags: FLAGS_NONE,
    example: 'msg: DB "Hello"',
  },
  {
    mnemonic: 'ADD',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Add the source to a register.',
    details: 'reg = reg + source.',
    flags: FLAGS_ARITH,
    example: 'ADD A, 1',
  },
  {
    mnemonic: 'SUB',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Subtract the source from a register.',
    details: 'reg = reg − source.',
    flags: FLAGS_ARITH,
    example: 'SUB B, A',
  },
  {
    mnemonic: 'INC',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Add 1 to a register.',
    details: 'reg = reg + 1.',
    flags: FLAGS_ARITH,
    example: 'INC C',
  },
  {
    mnemonic: 'DEC',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Subtract 1 from a register.',
    details: 'reg = reg − 1.',
    flags: FLAGS_ARITH,
    example: 'DEC C',
  },
  {
    mnemonic: 'MUL',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Multiply A by the operand.',
    details: 'A = A × operand. The result wraps at 256.',
    flags: FLAGS_ARITH,
    example: 'MUL 3',
  },
  {
    mnemonic: 'DIV',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Divide A by the operand (integer division).',
    details: 'A = A ÷ operand, rounded down. Dividing by 0 is a runtime fault.',
    flags: FLAGS_ARITH,
    example: 'DIV 2',
  },
  {
    mnemonic: 'AND',
    aliases: [],
    group: 'Logic',
    summary: 'Bitwise AND into a register.',
    details: 'reg = reg & source.',
    flags: 'Z if the result is 0. C cleared.',
    example: 'AND A, 0x0F',
  },
  {
    mnemonic: 'OR',
    aliases: [],
    group: 'Logic',
    summary: 'Bitwise OR into a register.',
    details: 'reg = reg | source.',
    flags: 'Z if the result is 0. C cleared.',
    example: 'OR A, 0x80',
  },
  {
    mnemonic: 'XOR',
    aliases: [],
    group: 'Logic',
    summary: 'Bitwise exclusive OR into a register.',
    details: 'reg = reg ^ source. XOR A, A clears A.',
    flags: 'Z if the result is 0. C cleared.',
    example: 'XOR A, A',
  },
  {
    mnemonic: 'NOT',
    aliases: [],
    group: 'Logic',
    summary: 'Invert every bit of a register.',
    details: 'reg = ~reg.',
    flags: 'C set. Z never set.',
    example: 'NOT B',
  },
  {
    mnemonic: 'SHL',
    aliases: ['SAL'],
    group: 'Logic',
    summary: 'Shift a register left.',
    details: 'reg = reg << count. Bits leaving the byte set C.',
    flags: FLAGS_ARITH,
    example: 'SHL A, 1',
  },
  {
    mnemonic: 'SHR',
    aliases: ['SAR'],
    group: 'Logic',
    summary: 'Shift a register right.',
    details: 'reg = reg >> count (zeros shift in).',
    flags: FLAGS_ARITH,
    example: 'SHR A, 1',
  },
  {
    mnemonic: 'CMP',
    aliases: [],
    group: 'Compare and jump',
    summary: 'Compare a register with a value (subtract without storing).',
    details: 'Sets the flags as reg − source would. Follow it with a conditional jump.',
    flags: 'Z if equal. C if reg is below the source.',
    example: 'CMP A, 10',
  },
  {
    mnemonic: 'JMP',
    aliases: [],
    group: 'Compare and jump',
    summary: 'Jump to an address or label.',
    details: 'IP = target. A register operand jumps to the address it holds.',
    flags: FLAGS_NONE,
    example: 'JMP loop',
  },
  {
    mnemonic: 'JZ',
    aliases: ['JE'],
    group: 'Compare and jump',
    summary: 'Jump if zero / equal.',
    details: 'Jumps when Z is set.',
    flags: FLAGS_NONE,
    example: 'JZ done',
  },
  {
    mnemonic: 'JNZ',
    aliases: ['JNE'],
    group: 'Compare and jump',
    summary: 'Jump if not zero / not equal.',
    details: 'Jumps when Z is clear.',
    flags: FLAGS_NONE,
    example: 'JNZ .loop',
  },
  {
    mnemonic: 'JC',
    aliases: ['JB', 'JNAE'],
    group: 'Compare and jump',
    summary: 'Jump if carry / below.',
    details: 'Jumps when C is set.',
    flags: FLAGS_NONE,
    example: 'JC overflow',
  },
  {
    mnemonic: 'JNC',
    aliases: ['JNB', 'JAE'],
    group: 'Compare and jump',
    summary: 'Jump if no carry / above or equal.',
    details: 'Jumps when C is clear.',
    flags: FLAGS_NONE,
    example: 'JNC ok',
  },
  {
    mnemonic: 'JA',
    aliases: ['JNBE'],
    group: 'Compare and jump',
    summary: 'Jump if above.',
    details: 'Jumps when both C and Z are clear.',
    flags: FLAGS_NONE,
    example: 'JA bigger',
  },
  {
    mnemonic: 'JNA',
    aliases: ['JBE'],
    group: 'Compare and jump',
    summary: 'Jump if not above (below or equal).',
    details: 'Jumps when C or Z is set.',
    flags: FLAGS_NONE,
    example: 'JNA smaller',
  },
  {
    mnemonic: 'PUSH',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Push a value onto the stack.',
    details: 'Stores the value at SP, then SP − 1. The stack starts at 0xE7 and grows down.',
    flags: FLAGS_NONE,
    example: 'PUSH A',
  },
  {
    mnemonic: 'POP',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Pop the top of the stack into a register.',
    details: 'SP + 1, then reads the byte at SP.',
    flags: FLAGS_NONE,
    example: 'POP A',
  },
  {
    mnemonic: 'CALL',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Call a routine.',
    details: 'Pushes the return address, then jumps. Return with RET.',
    flags: FLAGS_NONE,
    example: 'CALL print',
  },
  {
    mnemonic: 'RET',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Return from a routine.',
    details: 'Pops the return address pushed by CALL and jumps to it.',
    flags: FLAGS_NONE,
    example: 'RET',
  },
  {
    mnemonic: 'HLT',
    aliases: [],
    group: 'Machine',
    summary: 'Stop the program.',
    details: 'Opcode 0, so running into empty memory also halts.',
    flags: FLAGS_NONE,
    example: 'HLT',
  },
  {
    mnemonic: 'IN',
    aliases: [],
    group: 'Machine',
    summary: 'Read one key typed in the console into a register.',
    details: 'If nothing has been typed yet the program waits on this line until you type.',
    flags: FLAGS_NONE,
    example: 'IN A',
    isNew: true,
  },
  {
    mnemonic: 'OUT',
    aliases: [],
    group: 'Machine',
    summary: 'Write a register to the console as a character.',
    details: 'The console keeps every line; the 24-byte display at 0xE8 still works too.',
    flags: FLAGS_NONE,
    example: 'OUT A',
    isNew: true,
  },
];

export const INSTRUCTIONS: readonly InstructionDoc[] = ENTRIES.map((e) => ({
  ...e,
  forms: e.mnemonic === 'DB' ? [{ operands: 'value | "text"', opcode: -1, bytes: 1 }] : formsOf(e.mnemonic),
}));

const BY_NAME = new Map<string, InstructionDoc>();
for (const doc of INSTRUCTIONS) {
  BY_NAME.set(doc.mnemonic, doc);
  for (const alias of doc.aliases) BY_NAME.set(alias, doc);
}

/** Documentation for a mnemonic or alias (case-insensitive). */
export const findInstruction = (mnemonic: string): InstructionDoc | undefined =>
  BY_NAME.get(mnemonic.toUpperCase());
