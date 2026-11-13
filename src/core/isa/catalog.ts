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

export interface InstructionExample {
  readonly code: string;
  readonly note: string;
}

export interface InstructionDoc {
  readonly mnemonic: string;
  readonly aliases: readonly string[];
  readonly group: InstructionGroup;
  readonly summary: string;
  readonly details: string;
  readonly flags: string;
  readonly example: string;
  /** Short, complete snippets that assemble cleanly, each showing a different use. */
  readonly examples: readonly InstructionExample[];
  /** Edge cases and practical advice (wrap-around, flags, faults…). */
  readonly notes: readonly string[];
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
const FLAGS_LOGIC = 'Z if the result is 0. C cleared.';

const ENTRIES = [
  {
    mnemonic: 'MOV',
    aliases: [],
    group: 'Data',
    summary: 'Copy a value into a register or memory.',
    details:
      'The first operand is the destination, the second the source. Registers A–D and SP, an address, a register pointer [B] or [B+3], or a constant.',
    flags: FLAGS_NONE,
    example: 'MOV A, [0xE8]',
    examples: [
      { code: 'MOV A, 42', note: 'Load a constant into A.' },
      { code: "MOV [0xE8], 'H'", note: 'Write a character straight into the first display cell.' },
      { code: 'MOV B, 0x80\nMOV A, [B+2]', note: 'Read the byte at address B + 2, that is 0x82.' },
    ],
    notes: [
      'Memory to memory is not allowed: copy through a register (MOV A, [x] then MOV [y], A).',
      'MOV never changes the flags.',
      'The offset in [reg+n] must be between -16 and +15.',
      'Moving a value above 0xE7 (231) into SP is a "Stack underflow" fault.',
    ],
  },
  {
    mnemonic: 'DB',
    aliases: [],
    group: 'Data',
    summary: 'Define bytes: place a number, a character or a string in memory.',
    details: 'Not an instruction: the bytes are stored where the line is. Use a label to refer to them.',
    flags: FLAGS_NONE,
    example: 'msg: DB "Hello"',
    examples: [
      { code: 'DB "Hello"\nDB 0', note: 'A string followed by a 0 terminator.' },
      { code: "DB 'A'", note: 'A single character: stores 65.' },
      {
        code: 'JMP start\nmsg: DB "Hi"\nstart: MOV C, msg',
        note: 'Jump over the data so it is never run as code; the label gives its address.',
      },
    ],
    notes: [
      'One operand per line: a number, a character in single quotes or a string in double quotes.',
      'Every character needs a code between 0 and 255.',
      'A string is not terminated automatically: add DB 0 if your loop looks for the end.',
      'The CPU cannot tell data from code: jump over data or place it after HLT.',
    ],
  },
  {
    mnemonic: 'ADD',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Add the source to a register.',
    details: 'reg = reg + source.',
    flags: FLAGS_ARITH,
    example: 'ADD A, 1',
    examples: [
      { code: 'ADD A, 5', note: 'A = A + 5.' },
      { code: 'MOV A, 2\nMOV B, 3\nADD A, B', note: 'Add two registers: A becomes 5.' },
      { code: 'MOV C, 0x80\nADD A, [C]', note: 'Add the byte stored at the address held in C.' },
    ],
    notes: [
      'Past 255 the result wraps (255 + 1 = 0) and C is set; Z stays clear in that case even though the result is 0.',
      'The destination can be SP: ADD SP, 2 drops two bytes from the stack.',
    ],
  },
  {
    mnemonic: 'SUB',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Subtract the source from a register.',
    details: 'reg = reg − source.',
    flags: FLAGS_ARITH,
    example: 'SUB B, A',
    examples: [
      { code: 'SUB A, 1', note: 'A = A − 1.' },
      { code: 'MOV A, 3\nSUB A, 5', note: 'Below 0 the result wraps: A becomes 254 and C is set.' },
      { code: 'SUB A, A', note: 'Clear A and set Z.' },
    ],
    notes: [
      'Going below 0 wraps (0 − 1 = 255) and sets C; test it with JC.',
      'The destination can be SP: SUB SP, 3 reserves three bytes on the stack.',
    ],
  },
  {
    mnemonic: 'INC',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Add 1 to a register.',
    details: 'reg = reg + 1.',
    flags: FLAGS_ARITH,
    example: 'INC C',
    examples: [
      { code: 'INC A', note: 'A = A + 1.' },
      { code: 'MOV B, 255\nINC B', note: 'Wraps to 0 with C set (Z stays clear).' },
      { code: 'loop: INC C\nCMP C, 10\nJNZ loop', note: 'Count C up until it reaches 10.' },
    ],
    notes: ['Registers only (A–D or SP). To increment a byte in memory, load it, INC it and store it back.'],
  },
  {
    mnemonic: 'DEC',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Subtract 1 from a register.',
    details: 'reg = reg − 1.',
    flags: FLAGS_ARITH,
    example: 'DEC C',
    examples: [
      { code: 'DEC A', note: 'A = A − 1.' },
      {
        code: 'MOV C, 5\nloop: DEC C\nJNZ loop',
        note: 'Run a loop 5 times: it ends when C reaches 0 and Z is set.',
      },
      { code: 'MOV A, 0\nDEC A', note: 'Wraps to 255 with C set.' },
    ],
    notes: [
      'Reaching exactly 0 sets Z, which makes DEC followed by JNZ a compact loop.',
      'Registers only (A–D or SP).',
    ],
  },
  {
    mnemonic: 'MUL',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Multiply A by the operand.',
    details: 'A = A × operand. The result wraps at 256.',
    flags: FLAGS_ARITH,
    example: 'MUL 3',
    examples: [
      { code: 'MOV A, 6\nMUL 7', note: 'A = 42.' },
      { code: 'MOV B, 3\nMUL B', note: 'Multiply A by a register.' },
      { code: 'MUL [0x80]', note: 'Multiply A by the byte at address 0x80.' },
    ],
    notes: [
      'MUL always works on A; the operand is only the multiplier.',
      'Only the low byte is kept: 16 × 16 = 256 leaves A = 0 with C set and Z clear.',
      'MUL 0 gives 0 and sets Z.',
    ],
  },
  {
    mnemonic: 'DIV',
    aliases: [],
    group: 'Arithmetic',
    summary: 'Divide A by the operand (integer division).',
    details: 'A = A ÷ operand, rounded down. Dividing by 0 is a runtime fault.',
    flags: 'Z if the quotient is 0. C cleared.',
    example: 'DIV 2',
    examples: [
      { code: 'MOV A, 17\nDIV 5', note: 'A = 3: the remainder is lost.' },
      { code: 'MOV C, 2\nDIV C', note: 'Divide A by a register.' },
      { code: 'DIV [0x80]', note: 'Divide A by the byte at address 0x80.' },
    ],
    notes: [
      'Dividing by 0 stops the program with the fault "Division by 0"; Reset to run again.',
      'To get the remainder, keep a copy of A and compute A − (A ÷ n) × n.',
    ],
  },
  {
    mnemonic: 'AND',
    aliases: [],
    group: 'Logic',
    summary: 'Bitwise AND into a register.',
    details: 'reg = reg & source.',
    flags: FLAGS_LOGIC,
    example: 'AND A, 0x0F',
    examples: [
      { code: 'AND A, 0x0F', note: 'Keep the low 4 bits of A, clear the rest.' },
      { code: 'AND A, 1\nJZ even\neven: HLT', note: 'Test bit 0: Z is set when A is even.' },
      { code: 'AND B, C', note: 'Keep in B only the bits that are also set in C.' },
    ],
    notes: [
      'Use a mask with 0 where bits must be cleared.',
      'Destination and register source must be A–D (not SP).',
    ],
  },
  {
    mnemonic: 'OR',
    aliases: [],
    group: 'Logic',
    summary: 'Bitwise OR into a register.',
    details: 'reg = reg | source.',
    flags: FLAGS_LOGIC,
    example: 'OR A, 0x80',
    examples: [
      { code: 'OR A, 0x80', note: 'Set bit 7.' },
      { code: 'MOV A, 5\nOR A, 0x30', note: 'Turn the number 5 into the character "5" (0x35).' },
      { code: 'OR A, A', note: 'Set Z if A is 0, without changing A.' },
    ],
    notes: [
      'Use a mask with 1 where bits must be set.',
      'Destination and register source must be A–D (not SP).',
    ],
  },
  {
    mnemonic: 'XOR',
    aliases: [],
    group: 'Logic',
    summary: 'Bitwise exclusive OR into a register.',
    details: 'reg = reg ^ source. XOR A, A clears A.',
    flags: FLAGS_LOGIC,
    example: 'XOR A, A',
    examples: [
      { code: 'XOR A, A', note: 'Clear A and set Z.' },
      { code: 'XOR A, 0xFF', note: 'Invert every bit, like NOT but with C cleared.' },
      { code: 'XOR B, [D]', note: 'Flip the bits of B that are set in the byte at address D.' },
    ],
    notes: [
      'XOR with the same value twice gives back the original value.',
      'Destination and register source must be A–D (not SP).',
    ],
  },
  {
    mnemonic: 'NOT',
    aliases: [],
    group: 'Logic',
    summary: 'Invert every bit of a register.',
    details: 'reg = ~reg.',
    flags: 'C set. Z never set.',
    example: 'NOT B',
    examples: [
      { code: 'NOT B', note: 'B = 255 − B.' },
      { code: 'MOV A, 0x0F\nNOT A', note: 'A becomes 0xF0.' },
      { code: 'MOV A, 0xFF\nNOT A', note: 'A becomes 0, C is set and Z stays clear.' },
    ],
    notes: [
      'Because Z is never set, do not use JZ after NOT to test for 0: use CMP A, 0.',
      'Register only (A–D).',
    ],
  },
  {
    mnemonic: 'SHL',
    aliases: ['SAL'],
    group: 'Logic',
    summary: 'Shift a register left.',
    details: 'reg = reg << count. Bits leaving the byte set C.',
    flags: FLAGS_ARITH,
    example: 'SHL A, 1',
    examples: [
      { code: 'SHL A, 1', note: 'Multiply A by 2.' },
      { code: 'MOV A, 0x81\nSHL A, 1', note: 'Bit 7 falls out: A = 0x02 and C is set.' },
      { code: 'MOV B, 3\nSHL A, B', note: 'Shift by a count held in a register (A × 8).' },
    ],
    notes: [
      'Shifting left by n multiplies by 2ⁿ while the result fits in a byte.',
      'When every bit falls out Z is not set: 0x80 shifted left by 1 gives 0 with C set.',
    ],
  },
  {
    mnemonic: 'SHR',
    aliases: ['SAR'],
    group: 'Logic',
    summary: 'Shift a register right.',
    details: 'reg = reg >> count (zeros shift in).',
    flags: 'Z if the result is 0. C cleared: bits shifted out are lost.',
    example: 'SHR A, 1',
    examples: [
      { code: 'SHR A, 1', note: 'Divide A by 2, rounding down.' },
      { code: 'MOV A, 0xF0\nSHR A, 4', note: 'A = 0x0F.' },
      { code: 'MOV A, 1\nSHR A, 1', note: 'A = 0 and Z is set; C stays clear.' },
    ],
    notes: [
      'Zeros always come in from the left: SAR is the same logical shift, it does not keep the sign bit.',
    ],
  },
  {
    mnemonic: 'CMP',
    aliases: [],
    group: 'Compare and jump',
    summary: 'Compare a register with a value (subtract without storing).',
    details: 'Sets the flags as reg − source would. Follow it with a conditional jump.',
    flags: 'Z if equal. C if reg is below the source.',
    example: 'CMP A, 10',
    examples: [
      { code: 'CMP A, 10\nJZ ten\nten: HLT', note: 'Jump when A equals 10.' },
      { code: 'CMP A, B\nJC less\nless: HLT', note: 'Jump when A is below B.' },
      { code: 'CMP B, [C]', note: 'Compare B with the byte at the address held in C.' },
    ],
    notes: [
      'Only the flags change; the register keeps its value.',
      'Comparisons are unsigned: 200 is above 10.',
      'After CMP: JZ equal, JNZ different, JC below, JNC above or equal, JA above, JNA below or equal.',
    ],
  },
  {
    mnemonic: 'JMP',
    aliases: [],
    group: 'Compare and jump',
    summary: 'Jump to an address or label.',
    details: 'IP = target. A register operand jumps to the address it holds.',
    flags: FLAGS_NONE,
    example: 'JMP loop',
    examples: [
      { code: 'loop: INC A\nJMP loop', note: 'An endless loop.' },
      { code: 'JMP 0', note: 'Start again from address 0.' },
      { code: 'MOV B, target\nJMP B\ntarget: HLT', note: 'Jump to the address held in a register.' },
    ],
    notes: [
      'A label is replaced by its address when the program is assembled.',
      'Jumping into data makes the CPU run the data as instructions.',
    ],
  },
  {
    mnemonic: 'JZ',
    aliases: ['JE'],
    group: 'Compare and jump',
    summary: 'Jump if zero / equal.',
    details: 'Jumps when Z is set.',
    flags: FLAGS_NONE,
    example: 'JZ done',
    examples: [
      { code: 'CMP A, 0\nJZ empty\nempty: HLT', note: 'Jump when A is 0.' },
      { code: 'DEC C\nJZ done\ndone: HLT', note: 'Jump when the counter reaches 0.' },
    ],
    notes: [
      'JE is the same instruction; read it as "jump if equal" after CMP.',
      'A result that wraps from 255 to 0 sets C but not Z.',
    ],
  },
  {
    mnemonic: 'JNZ',
    aliases: ['JNE'],
    group: 'Compare and jump',
    summary: 'Jump if not zero / not equal.',
    details: 'Jumps when Z is clear.',
    flags: FLAGS_NONE,
    example: 'JNZ .loop',
    examples: [
      { code: 'MOV C, 3\nagain: DEC C\nJNZ again', note: 'Repeat a loop 3 times.' },
      { code: "CMP A, 'q'\nJNE other\nother: HLT", note: 'Jump when A is not the character q.' },
    ],
    notes: [
      'JNE is the same instruction.',
      'Labels starting with a dot, like .loop, are not local: every label name must be unique in the file.',
    ],
  },
  {
    mnemonic: 'JC',
    aliases: ['JB', 'JNAE'],
    group: 'Compare and jump',
    summary: 'Jump if carry / below.',
    details: 'Jumps when C is set.',
    flags: FLAGS_NONE,
    example: 'JC overflow',
    examples: [
      { code: 'ADD A, 200\nJC overflow\noverflow: HLT', note: 'Detect a sum above 255.' },
      { code: 'CMP A, 10\nJB small\nsmall: HLT', note: 'Jump when A is below 10.' },
    ],
    notes: ['JB and JNAE are the same instruction.'],
  },
  {
    mnemonic: 'JNC',
    aliases: ['JNB', 'JAE'],
    group: 'Compare and jump',
    summary: 'Jump if no carry / above or equal.',
    details: 'Jumps when C is clear.',
    flags: FLAGS_NONE,
    example: 'JNC ok',
    examples: [
      { code: 'CMP A, 10\nJAE big\nbig: HLT', note: 'Jump when A is 10 or more.' },
      { code: 'SUB A, 1\nJNC ok\nok: HLT', note: 'Continue only if A did not go below 0.' },
    ],
    notes: ['JNB and JAE are the same instruction.'],
  },
  {
    mnemonic: 'JA',
    aliases: ['JNBE'],
    group: 'Compare and jump',
    summary: 'Jump if above.',
    details: 'Jumps when both C and Z are clear.',
    flags: FLAGS_NONE,
    example: 'JA bigger',
    examples: [
      { code: "CMP A, 'z'\nJA other\nother: HLT", note: 'Jump when A is above the character z (122).' },
      { code: 'CMP A, B\nJA bigger\nbigger: HLT', note: 'Jump when A is strictly above B.' },
    ],
    notes: ['Strictly above: equal values do not jump.', 'JNBE is the same instruction.'],
  },
  {
    mnemonic: 'JNA',
    aliases: ['JBE'],
    group: 'Compare and jump',
    summary: 'Jump if not above (below or equal).',
    details: 'Jumps when C or Z is set.',
    flags: FLAGS_NONE,
    example: 'JNA smaller',
    examples: [
      { code: 'CMP A, 9\nJNA digit\ndigit: HLT', note: 'Jump when A is 9 or less.' },
      { code: 'CMP B, A\nJBE smaller\nsmaller: HLT', note: 'Jump when B is below or equal to A.' },
    ],
    notes: ['JBE is the same instruction.'],
  },
  {
    mnemonic: 'PUSH',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Push a value onto the stack.',
    details: 'Stores the value at SP, then SP − 1. The stack starts at 0xE7 and grows down.',
    flags: FLAGS_NONE,
    example: 'PUSH A',
    examples: [
      { code: 'PUSH A', note: 'Save A on the stack.' },
      { code: 'PUSH 10', note: 'Push a constant.' },
      { code: 'PUSH A\nPUSH B\nPOP A\nPOP B', note: 'Swap A and B through the stack.' },
    ],
    notes: [
      'The stack grows down towards your program and nothing protects the code from being overwritten.',
      'Pushing when SP is 0 is a "Stack overflow" fault.',
      'A register operand must be A–D; PUSH also accepts [reg], [address] and a constant.',
    ],
  },
  {
    mnemonic: 'POP',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Pop the top of the stack into a register.',
    details: 'SP + 1, then reads the byte at SP.',
    flags: FLAGS_NONE,
    example: 'POP A',
    examples: [
      { code: 'POP A', note: 'Restore A from the stack.' },
      { code: 'PUSH 7\nPOP C', note: 'C = 7.' },
    ],
    notes: [
      'Pop in the reverse order of the pushes.',
      'Popping with an empty stack (SP = 0xE7) is a "Stack underflow" fault.',
      'Register only (A–D).',
    ],
  },
  {
    mnemonic: 'CALL',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Call a routine.',
    details: 'Pushes the return address, then jumps. Return with RET.',
    flags: FLAGS_NONE,
    example: 'CALL print',
    examples: [
      { code: 'CALL print\nHLT\nprint: OUT A\nRET', note: 'Call a routine that prints A, then stop.' },
      { code: 'MOV B, routine\nCALL B\nHLT\nroutine: RET', note: 'Call the address held in a register.' },
    ],
    notes: [
      'The return address takes one byte of stack.',
      'Pass arguments in registers (for example C = text, D = destination) and save the registers the routine changes with PUSH and POP.',
    ],
  },
  {
    mnemonic: 'RET',
    aliases: [],
    group: 'Stack and calls',
    summary: 'Return from a routine.',
    details: 'Pops the return address pushed by CALL and jumps to it.',
    flags: FLAGS_NONE,
    example: 'RET',
    examples: [
      { code: 'CALL square\nHLT\nsquare: MUL A\nRET', note: 'A routine that squares A.' },
      { code: 'RET', note: 'Return to the caller.' },
    ],
    notes: [
      'Every PUSH inside the routine needs its POP before RET, or RET jumps to the wrong address.',
      'RET with an empty stack is a "Stack underflow" fault.',
    ],
  },
  {
    mnemonic: 'HLT',
    aliases: [],
    group: 'Machine',
    summary: 'Stop the program.',
    details: 'Opcode 0, so running into empty memory also halts.',
    flags: FLAGS_NONE,
    example: 'HLT',
    examples: [
      { code: 'HLT', note: 'Stop here.' },
      { code: 'CMP A, 0\nJNZ go\nHLT\ngo: OUT A', note: 'Stop early when A is 0.' },
    ],
    notes: ['Memory starts filled with 0, so a program without HLT stops when it runs past its end.'],
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
    examples: [
      { code: 'IN A', note: 'Wait for a key and store its character code in A.' },
      { code: 'IN A\nOUT A', note: 'Echo: print the key that was typed.' },
      { code: 'wait: IN A\nCMP A, 10\nJNZ wait', note: 'Read keys until Enter (code 10).' },
    ],
    notes: [
      'Enter is read as 10, Backspace as 8 and Escape as 27.',
      'Keys typed before IN runs are kept and read one per IN, in order.',
      'Register only (A–D).',
    ],
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
    examples: [
      { code: "MOV A, 'A'\nOUT A", note: 'Print the letter A.' },
      { code: 'MOV A, 10\nOUT A', note: 'Start a new console line (code 10).' },
      { code: 'MOV A, 7\nOR A, 0x30\nOUT A', note: 'Print the digit 7.' },
    ],
    notes: [
      'Codes outside printable ASCII (32–126) show as ·, except newline (10) and tab (9).',
      'Register only (A–D): to print a constant, MOV it into a register first.',
    ],
  },
] as const satisfies readonly Entry[];

/** One catalog entry with its literal types (used to type translations). */
export type CatalogEntry = (typeof ENTRIES)[number];
/** Every documented mnemonic (aliases excluded). */
export type Mnemonic = CatalogEntry['mnemonic'];

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
