import { Opcode } from '../isa/opcodes';

/** What an operand turned out to be after parsing. */
export type OperandKind = 'register' | 'regaddress' | 'address' | 'number' | 'numbers';

export interface Encoding {
  /** Number of operands the instruction takes. */
  readonly arity: 0 | 1 | 2;
  /** Opcode per operand-kind signature, e.g. `register,number`. */
  readonly forms: Readonly<Record<string, number>>;
}

const binaryArith = (reg: number, regaddr: number, addr: number, num: number): Encoding => ({
  arity: 2,
  forms: {
    'register,register': reg,
    'register,regaddress': regaddr,
    'register,address': addr,
    'register,number': num,
  },
});

const jump = (regaddr: number, addr: number): Encoding => ({
  arity: 1,
  forms: { register: regaddr, number: addr },
});

const unaryA = (reg: number, regaddr: number, addr: number, num: number): Encoding => ({
  arity: 1,
  forms: { register: reg, regaddress: regaddr, address: addr, number: num },
});

const SHL = binaryArith(
  Opcode.SHL_REG_WITH_REG,
  Opcode.SHL_REGADDRESS_WITH_REG,
  Opcode.SHL_ADDRESS_WITH_REG,
  Opcode.SHL_NUMBER_WITH_REG,
);
const SHR = binaryArith(
  Opcode.SHR_REG_WITH_REG,
  Opcode.SHR_REGADDRESS_WITH_REG,
  Opcode.SHR_ADDRESS_WITH_REG,
  Opcode.SHR_NUMBER_WITH_REG,
);
const JC = jump(Opcode.JC_REGADDRESS, Opcode.JC_ADDRESS);
const JNC = jump(Opcode.JNC_REGADDRESS, Opcode.JNC_ADDRESS);
const JZ = jump(Opcode.JZ_REGADDRESS, Opcode.JZ_ADDRESS);
const JNZ = jump(Opcode.JNZ_REGADDRESS, Opcode.JNZ_ADDRESS);
const JA = jump(Opcode.JA_REGADDRESS, Opcode.JA_ADDRESS);
const JNA = jump(Opcode.JNA_REGADDRESS, Opcode.JNA_ADDRESS);

/**
 * Encoding table for every mnemonic (aliases included). `DB` is handled separately because it
 * emits raw data instead of an opcode.
 */
export const ENCODINGS: Readonly<Record<string, Encoding>> = {
  HLT: { arity: 0, forms: { '': Opcode.HLT } },
  RET: { arity: 0, forms: { '': Opcode.RET } },
  MOV: {
    arity: 2,
    forms: {
      'register,register': Opcode.MOV_REG_TO_REG,
      'register,address': Opcode.MOV_ADDRESS_TO_REG,
      'register,regaddress': Opcode.MOV_REGADDRESS_TO_REG,
      'address,register': Opcode.MOV_REG_TO_ADDRESS,
      'regaddress,register': Opcode.MOV_REG_TO_REGADDRESS,
      'register,number': Opcode.MOV_NUMBER_TO_REG,
      'address,number': Opcode.MOV_NUMBER_TO_ADDRESS,
      'regaddress,number': Opcode.MOV_NUMBER_TO_REGADDRESS,
    },
  },
  ADD: binaryArith(
    Opcode.ADD_REG_TO_REG,
    Opcode.ADD_REGADDRESS_TO_REG,
    Opcode.ADD_ADDRESS_TO_REG,
    Opcode.ADD_NUMBER_TO_REG,
  ),
  SUB: binaryArith(
    Opcode.SUB_REG_FROM_REG,
    Opcode.SUB_REGADDRESS_FROM_REG,
    Opcode.SUB_ADDRESS_FROM_REG,
    Opcode.SUB_NUMBER_FROM_REG,
  ),
  CMP: binaryArith(
    Opcode.CMP_REG_WITH_REG,
    Opcode.CMP_REGADDRESS_WITH_REG,
    Opcode.CMP_ADDRESS_WITH_REG,
    Opcode.CMP_NUMBER_WITH_REG,
  ),
  AND: binaryArith(
    Opcode.AND_REG_WITH_REG,
    Opcode.AND_REGADDRESS_WITH_REG,
    Opcode.AND_ADDRESS_WITH_REG,
    Opcode.AND_NUMBER_WITH_REG,
  ),
  OR: binaryArith(
    Opcode.OR_REG_WITH_REG,
    Opcode.OR_REGADDRESS_WITH_REG,
    Opcode.OR_ADDRESS_WITH_REG,
    Opcode.OR_NUMBER_WITH_REG,
  ),
  XOR: binaryArith(
    Opcode.XOR_REG_WITH_REG,
    Opcode.XOR_REGADDRESS_WITH_REG,
    Opcode.XOR_ADDRESS_WITH_REG,
    Opcode.XOR_NUMBER_WITH_REG,
  ),
  SHL,
  SAL: SHL,
  SHR,
  SAR: SHR,
  INC: { arity: 1, forms: { register: Opcode.INC_REG } },
  DEC: { arity: 1, forms: { register: Opcode.DEC_REG } },
  NOT: { arity: 1, forms: { register: Opcode.NOT_REG } },
  POP: { arity: 1, forms: { register: Opcode.POP_REG } },
  IN: { arity: 1, forms: { register: Opcode.IN_REG } },
  OUT: { arity: 1, forms: { register: Opcode.OUT_REG } },
  JMP: jump(Opcode.JMP_REGADDRESS, Opcode.JMP_ADDRESS),
  CALL: jump(Opcode.CALL_REGADDRESS, Opcode.CALL_ADDRESS),
  JC,
  JB: JC,
  JNAE: JC,
  JNC,
  JNB: JNC,
  JAE: JNC,
  JZ,
  JE: JZ,
  JNZ,
  JNE: JNZ,
  JA,
  JNBE: JA,
  JNA,
  JBE: JNA,
  PUSH: unaryA(Opcode.PUSH_REG, Opcode.PUSH_REGADDRESS, Opcode.PUSH_ADDRESS, Opcode.PUSH_NUMBER),
  MUL: unaryA(Opcode.MUL_REG, Opcode.MUL_REGADDRESS, Opcode.MUL_ADDRESS, Opcode.MUL_NUMBER),
  DIV: unaryA(Opcode.DIV_REG, Opcode.DIV_REGADDRESS, Opcode.DIV_ADDRESS, Opcode.DIV_NUMBER),
};

/** Every mnemonic the assembler accepts, `DB` included. */
export const MNEMONICS: readonly string[] = ['DB', ...Object.keys(ENCODINGS)];
