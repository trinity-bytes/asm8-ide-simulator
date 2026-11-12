import { Opcode } from '../isa/opcodes';
import { MachineFault } from './fault';
import { MAX_SP, MIN_SP } from './layout';
import type { Memory } from './memory';

/** Keyboard input and console output for the IN/OUT instructions. */
export interface Io {
  /** Next byte typed by the user, or undefined when nothing is waiting. */
  read(): number | undefined;
  write(byte: number): void;
}

export interface Registers {
  /** A, B, C, D. */
  readonly gpr: readonly [number, number, number, number];
  readonly sp: number;
  readonly ip: number;
  readonly zero: boolean;
  readonly carry: boolean;
  readonly fault: boolean;
}

/**
 * - `ok`: one instruction ran.
 * - `halted`: HLT reached (IP stays on it).
 * - `waiting`: IN found no input; IP stays on IN so the next step retries.
 */
export type StepOutcome = 'ok' | 'halted' | 'waiting';

const GPR_COUNT = 4;
const SP_CODE = 4;

/**
 * The 8-bit CPU. Behaviour matches the legacy simulator instruction by instruction, including the
 * order in which IP advances before a fault. Intentional differences are listed in
 * `docs/parity.md`.
 */
export class Cpu {
  gpr: [number, number, number, number] = [0, 0, 0, 0];
  sp = MAX_SP;
  ip = 0;
  zero = false;
  carry = false;
  fault = false;

  constructor(
    private readonly memory: Memory,
    private readonly io: Io,
  ) {}

  reset(): void {
    this.gpr = [0, 0, 0, 0];
    this.sp = MAX_SP;
    this.ip = 0;
    this.zero = false;
    this.carry = false;
    this.fault = false;
  }

  registers(): Registers {
    return {
      gpr: [...this.gpr],
      sp: this.sp,
      ip: this.ip,
      zero: this.zero,
      carry: this.carry,
      fault: this.fault,
    };
  }

  /** Runs one instruction. Throws MachineFault and sets `fault` on a runtime error. */
  step(): StepOutcome {
    if (this.fault) throw new MachineFault('FAULT. Reset to continue.');
    try {
      return this.execute();
    } catch (e) {
      this.fault = true;
      throw e instanceof MachineFault ? e : new MachineFault(String(e));
    }
  }

  // ---- helpers (names follow the legacy implementation) ----

  private fetch(): number {
    return this.memory.load(++this.ip);
  }

  private checkGPR(reg: number): number {
    if (reg < 0 || reg >= GPR_COUNT) throw new MachineFault(`Invalid register: ${reg}`);
    return reg;
  }

  private checkGPR_SP(reg: number): number {
    if (reg < 0 || reg >= GPR_COUNT + 1) throw new MachineFault(`Invalid register: ${reg}`);
    return reg;
  }

  private get(reg: number): number {
    if (reg >= 0 && reg < GPR_COUNT) return this.gpr[reg]!;
    if (reg === SP_CODE) return this.sp;
    throw new MachineFault(`Invalid register: ${reg}`);
  }

  private set(reg: number, value: number): void {
    if (reg >= 0 && reg < GPR_COUNT) {
      this.gpr[reg] = value;
    } else if (reg === SP_CODE) {
      this.sp = value;
      if (this.sp < MIN_SP) throw new MachineFault('Stack overflow');
      if (this.sp > MAX_SP) throw new MachineFault('Stack underflow');
    } else {
      throw new MachineFault(`Invalid register: ${reg}`);
    }
  }

  /** `[reg±offset]`: low 3 bits pick the register, high 5 bits are a signed offset. */
  private indirect(encoded: number): number {
    const reg = encoded % 8;
    const base = reg < GPR_COUNT ? this.gpr[reg]! : this.sp;
    let offset = Math.floor(encoded / 8);
    if (offset > 15) offset -= 32;
    return base + offset;
  }

  /** Sets flags and wraps the result to a byte (legacy rules: 256 sets carry but not zero). */
  private flags(value: number): number {
    this.zero = false;
    this.carry = false;
    if (value >= 256) {
      this.carry = true;
      return value % 256;
    }
    if (value === 0) {
      this.zero = true;
      return value;
    }
    if (value < 0) {
      this.carry = true;
      // Legacy returned 256 for multiples of -256 (e.g. NOT 0xFF); Asm8 wraps to 0.
      return (256 - (-value % 256)) % 256;
    }
    return value;
  }

  private jump(target: number): void {
    if (target < 0 || target >= this.memory.data.length) throw new MachineFault('IP outside memory');
    this.ip = target;
  }

  private push(value: number): void {
    this.memory.store(this.sp--, value);
    if (this.sp < MIN_SP) throw new MachineFault('Stack overflow');
  }

  private pop(): number {
    const value = this.memory.load(++this.sp);
    if (this.sp > MAX_SP) throw new MachineFault('Stack underflow');
    return value;
  }

  private divide(divisor: number): number {
    if (divisor === 0) throw new MachineFault('Division by 0');
    return Math.floor(this.gpr[0] / divisor);
  }

  /** Conditional jump: the operand is a register (`regMode`) or an address. */
  private branch(taken: boolean, regMode: boolean): void {
    const operand = regMode ? this.checkGPR(this.fetch()) : this.fetch();
    if (taken) this.jump(regMode ? this.gpr[operand]! : operand);
    else this.ip++;
  }

  /** dst(reg A–D or SP) = op(dst, src) with flags, used by ADD and SUB. */
  private arithSP(src: (dst: number) => number, op: (a: number, b: number) => number): void {
    const dst = this.checkGPR_SP(this.fetch());
    this.set(dst, this.flags(op(this.get(dst), src(dst))));
    this.ip++;
  }

  /** dst(reg A–D) = op(dst, src) with flags, used by AND/OR/XOR/SHL/SHR. */
  private logic(src: () => number, op: (a: number, b: number) => number): void {
    const dst = this.checkGPR(this.fetch());
    const value = src();
    this.gpr[dst] = this.flags(op(this.gpr[dst]!, value));
    this.ip++;
  }

  private compare(src: () => number): void {
    const dst = this.checkGPR_SP(this.fetch());
    this.flags(this.get(dst) - src());
    this.ip++;
  }

  // Operand readers for the second operand.
  private readonly regSP = () => this.get(this.checkGPR_SP(this.fetch()));
  private readonly reg = () => this.gpr[this.checkGPR(this.fetch())]!;
  private readonly regAddr = () => this.memory.load(this.indirect(this.fetch()));
  private readonly addr = () => this.memory.load(this.fetch());
  private readonly num = () => this.fetch();

  private execute(): StepOutcome {
    if (this.ip < 0 || this.ip >= this.memory.data.length) {
      throw new MachineFault('Instruction pointer is outside of memory');
    }

    const add = (a: number, b: number) => a + b;
    const sub = (a: number, b: number) => a - b;
    const and = (a: number, b: number) => a & b;
    const or = (a: number, b: number) => a | b;
    const xor = (a: number, b: number) => a ^ b;
    const shl = (a: number, b: number) => a << b;
    const shr = (a: number, b: number) => a >>> b;

    const instr = this.memory.load(this.ip);
    switch (instr) {
      case Opcode.HLT:
        return 'halted';

      case Opcode.MOV_REG_TO_REG: {
        const to = this.checkGPR_SP(this.fetch());
        this.set(to, this.regSP());
        this.ip++;
        break;
      }
      case Opcode.MOV_ADDRESS_TO_REG: {
        const to = this.checkGPR_SP(this.fetch());
        this.set(to, this.addr());
        this.ip++;
        break;
      }
      case Opcode.MOV_REGADDRESS_TO_REG: {
        const to = this.checkGPR_SP(this.fetch());
        this.set(to, this.regAddr());
        this.ip++;
        break;
      }
      case Opcode.MOV_REG_TO_ADDRESS: {
        const to = this.fetch();
        this.memory.store(to, this.regSP());
        this.ip++;
        break;
      }
      case Opcode.MOV_REG_TO_REGADDRESS: {
        const to = this.fetch();
        const value = this.regSP();
        this.memory.store(this.indirect(to), value);
        this.ip++;
        break;
      }
      case Opcode.MOV_NUMBER_TO_REG: {
        const to = this.checkGPR_SP(this.fetch());
        this.set(to, this.num());
        this.ip++;
        break;
      }
      case Opcode.MOV_NUMBER_TO_ADDRESS: {
        const to = this.fetch();
        this.memory.store(to, this.num());
        this.ip++;
        break;
      }
      case Opcode.MOV_NUMBER_TO_REGADDRESS: {
        const to = this.fetch();
        const value = this.num();
        this.memory.store(this.indirect(to), value);
        this.ip++;
        break;
      }

      case Opcode.ADD_REG_TO_REG:
        this.arithSP(this.regSP, add);
        break;
      case Opcode.ADD_REGADDRESS_TO_REG:
        this.arithSP(this.regAddr, add);
        break;
      case Opcode.ADD_ADDRESS_TO_REG:
        this.arithSP(this.addr, add);
        break;
      case Opcode.ADD_NUMBER_TO_REG:
        this.arithSP(this.num, add);
        break;
      // Legacy read gpr[regFrom] here, so `SUB A, SP` subtracted undefined. Asm8 reads SP.
      case Opcode.SUB_REG_FROM_REG:
        this.arithSP(this.regSP, sub);
        break;
      case Opcode.SUB_REGADDRESS_FROM_REG:
        this.arithSP(this.regAddr, sub);
        break;
      case Opcode.SUB_ADDRESS_FROM_REG:
        this.arithSP(this.addr, sub);
        break;
      case Opcode.SUB_NUMBER_FROM_REG:
        this.arithSP(this.num, sub);
        break;
      case Opcode.INC_REG:
        this.arithSP(() => 1, add);
        break;
      case Opcode.DEC_REG:
        this.arithSP(() => 1, sub);
        break;

      case Opcode.CMP_REG_WITH_REG:
        this.compare(this.regSP);
        break;
      case Opcode.CMP_REGADDRESS_WITH_REG:
        this.compare(this.regAddr);
        break;
      case Opcode.CMP_ADDRESS_WITH_REG:
        this.compare(this.addr);
        break;
      case Opcode.CMP_NUMBER_WITH_REG:
        this.compare(this.num);
        break;

      case Opcode.JMP_REGADDRESS:
        this.jump(this.gpr[this.checkGPR(this.fetch())]!);
        break;
      case Opcode.JMP_ADDRESS:
        this.jump(this.fetch());
        break;
      case Opcode.JC_REGADDRESS:
      case Opcode.JC_ADDRESS:
        this.branch(this.carry, instr === Opcode.JC_REGADDRESS);
        break;
      case Opcode.JNC_REGADDRESS:
      case Opcode.JNC_ADDRESS:
        this.branch(!this.carry, instr === Opcode.JNC_REGADDRESS);
        break;
      case Opcode.JZ_REGADDRESS:
      case Opcode.JZ_ADDRESS:
        this.branch(this.zero, instr === Opcode.JZ_REGADDRESS);
        break;
      case Opcode.JNZ_REGADDRESS:
      case Opcode.JNZ_ADDRESS:
        this.branch(!this.zero, instr === Opcode.JNZ_REGADDRESS);
        break;
      case Opcode.JA_REGADDRESS:
      case Opcode.JA_ADDRESS:
        this.branch(!this.zero && !this.carry, instr === Opcode.JA_REGADDRESS);
        break;
      case Opcode.JNA_REGADDRESS:
      case Opcode.JNA_ADDRESS:
        this.branch(this.zero || this.carry, instr === Opcode.JNA_REGADDRESS);
        break;

      case Opcode.PUSH_REG:
        this.push(this.reg());
        this.ip++;
        break;
      case Opcode.PUSH_REGADDRESS:
        this.push(this.regAddr());
        this.ip++;
        break;
      case Opcode.PUSH_ADDRESS:
        this.push(this.addr());
        this.ip++;
        break;
      case Opcode.PUSH_NUMBER:
        this.push(this.num());
        this.ip++;
        break;
      case Opcode.POP_REG: {
        const to = this.checkGPR(this.fetch());
        this.gpr[to] = this.pop();
        this.ip++;
        break;
      }
      case Opcode.CALL_REGADDRESS: {
        const reg = this.checkGPR(this.fetch());
        this.push(this.ip + 1);
        this.jump(this.gpr[reg]!);
        break;
      }
      case Opcode.CALL_ADDRESS: {
        const target = this.fetch();
        this.push(this.ip + 1);
        this.jump(target);
        break;
      }
      case Opcode.RET:
        this.jump(this.pop());
        break;

      case Opcode.MUL_REG:
      case Opcode.MUL_REGADDRESS:
      case Opcode.MUL_ADDRESS:
      case Opcode.MUL_NUMBER: {
        const value = this.unarySource(instr - Opcode.MUL_REG);
        this.gpr[0] = this.flags(this.gpr[0] * value);
        this.ip++;
        break;
      }
      case Opcode.DIV_REG:
      case Opcode.DIV_REGADDRESS:
      case Opcode.DIV_ADDRESS:
      case Opcode.DIV_NUMBER: {
        const value = this.unarySource(instr - Opcode.DIV_REG);
        this.gpr[0] = this.flags(this.divide(value));
        this.ip++;
        break;
      }

      case Opcode.AND_REG_WITH_REG:
        this.logic(this.reg, and);
        break;
      case Opcode.AND_REGADDRESS_WITH_REG:
        this.logic(this.regAddr, and);
        break;
      case Opcode.AND_ADDRESS_WITH_REG:
        this.logic(this.addr, and);
        break;
      case Opcode.AND_NUMBER_WITH_REG:
        this.logic(this.num, and);
        break;
      case Opcode.OR_REG_WITH_REG:
        this.logic(this.reg, or);
        break;
      case Opcode.OR_REGADDRESS_WITH_REG:
        this.logic(this.regAddr, or);
        break;
      case Opcode.OR_ADDRESS_WITH_REG:
        this.logic(this.addr, or);
        break;
      case Opcode.OR_NUMBER_WITH_REG:
        this.logic(this.num, or);
        break;
      case Opcode.XOR_REG_WITH_REG:
        this.logic(this.reg, xor);
        break;
      case Opcode.XOR_REGADDRESS_WITH_REG:
        this.logic(this.regAddr, xor);
        break;
      case Opcode.XOR_ADDRESS_WITH_REG:
        this.logic(this.addr, xor);
        break;
      case Opcode.XOR_NUMBER_WITH_REG:
        this.logic(this.num, xor);
        break;
      case Opcode.NOT_REG: {
        const reg = this.checkGPR(this.fetch());
        this.gpr[reg] = this.flags(~this.gpr[reg]!);
        this.ip++;
        break;
      }
      case Opcode.SHL_REG_WITH_REG:
        this.logic(this.reg, shl);
        break;
      case Opcode.SHL_REGADDRESS_WITH_REG:
        this.logic(this.regAddr, shl);
        break;
      case Opcode.SHL_ADDRESS_WITH_REG:
        this.logic(this.addr, shl);
        break;
      case Opcode.SHL_NUMBER_WITH_REG:
        this.logic(this.num, shl);
        break;
      case Opcode.SHR_REG_WITH_REG:
        this.logic(this.reg, shr);
        break;
      case Opcode.SHR_REGADDRESS_WITH_REG:
        this.logic(this.regAddr, shr);
        break;
      case Opcode.SHR_ADDRESS_WITH_REG:
        this.logic(this.addr, shr);
        break;
      case Opcode.SHR_NUMBER_WITH_REG:
        this.logic(this.num, shr);
        break;

      case Opcode.IN_REG: {
        const reg = this.checkGPR(this.memory.load(this.ip + 1));
        const byte = this.io.read();
        if (byte === undefined) return 'waiting';
        this.ip++;
        this.gpr[reg] = byte & 0xff;
        this.ip++;
        break;
      }
      case Opcode.OUT_REG:
        this.io.write(this.reg());
        this.ip++;
        break;

      default:
        throw new MachineFault(`Invalid op code: ${instr}`);
    }
    return 'ok';
  }

  /** MUL/DIV operand by form offset: 0 register, 1 [register], 2 [address], 3 number. */
  private unarySource(form: number): number {
    switch (form) {
      case 0:
        return this.reg();
      case 1:
        return this.regAddr();
      case 2:
        return this.addr();
      default:
        return this.num();
    }
  }
}
