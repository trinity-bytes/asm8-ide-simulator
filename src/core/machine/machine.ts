import type { Assembly } from '../assembler/assembler';
import { Cpu, type Registers } from './cpu';
import { MachineFault } from './fault';
import { Memory } from './memory';

/** One byte written to memory while the program ran. */
export interface MemoryWrite {
  readonly step: number;
  readonly address: number;
  readonly previous: number;
  readonly value: number;
  /** Source line of the instruction that wrote it, when known. */
  readonly line: number | undefined;
}

export type MachineStatus = 'empty' | 'ready' | 'halted' | 'waiting' | 'fault';

export type StepResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'halted' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'fault'; readonly message: string };

/** Plain, serialisable picture of the machine (sent from the worker to the UI). */
export interface MachineSnapshot {
  readonly status: MachineStatus;
  readonly registers: Registers;
  readonly memory: Uint8Array;
  readonly lastAccess: number;
  readonly steps: number;
  /** Source line of the instruction at IP, if IP points at one. */
  readonly line: number | undefined;
  readonly fault: string | undefined;
  readonly pendingInput: number;
}

export const MAX_WRITES_KEPT = 10_000;

/** Everything needed to put the machine back exactly as it was (Reset → Undo). */
export interface MachineState {
  readonly gpr: [number, number, number, number];
  readonly sp: number;
  readonly ip: number;
  readonly zero: boolean;
  readonly carry: boolean;
  readonly fault: boolean;
  readonly memory: Uint8Array;
  readonly lastAccess: number;
  readonly steps: number;
  readonly status: MachineStatus;
  readonly faultMessage: string | undefined;
  readonly input: readonly number[];
  readonly writes: readonly MemoryWrite[];
  readonly totalWrites: number;
}

/**
 * The whole simulated computer: CPU, memory, keyboard buffer and console output.
 * Owns a loaded program so it can map addresses back to source lines.
 */
export class Machine {
  readonly memory = new Memory();
  readonly cpu: Cpu;
  private program: Assembly | null = null;
  private input: number[] = [];
  private outputListener: ((bytes: number[]) => void) | null = null;
  private outputBuffer: number[] = [];
  private _writes: MemoryWrite[] = [];
  private _totalWrites = 0;
  private _steps = 0;
  private _status: MachineStatus = 'empty';
  private _fault: string | undefined;
  private currentLine: number | undefined;

  constructor() {
    this.cpu = new Cpu(this.memory, {
      read: () => this.input.shift(),
      write: (byte) => this.outputBuffer.push(byte),
    });
    this.memory.onStore = (address, previous, value) => {
      this._writes.push({ step: this._steps + 1, address, previous, value, line: this.currentLine });
      this._totalWrites++;
      if (this._writes.length > MAX_WRITES_KEPT)
        this._writes.splice(0, this._writes.length - MAX_WRITES_KEPT);
    };
  }

  get status(): MachineStatus {
    return this._status;
  }
  get steps(): number {
    return this._steps;
  }
  get writes(): readonly MemoryWrite[] {
    return this._writes;
  }
  /** Writes since load or reset, including ones dropped from `writes` (monotonic). */
  get totalWrites(): number {
    return this._totalWrites;
  }
  get assembly(): Assembly | null {
    return this.program;
  }

  /** Line of the instruction at IP. */
  lineAt(address: number): number | undefined {
    return this.program?.addressToLine.get(address);
  }

  /** Resets CPU and memory and copies the program to address 0. */
  load(program: Assembly): void {
    this.program = program;
    this.reset();
  }

  /** Back to the state right after loading: same program, cleared registers and output. */
  reset(): void {
    this.cpu.reset();
    this.memory.reset();
    if (this.program) this.memory.loadProgram(this.program.code);
    this.input = [];
    this.outputBuffer = [];
    this._writes = [];
    this._totalWrites = 0;
    this._steps = 0;
    this._fault = undefined;
    this._status = this.program ? 'ready' : 'empty';
  }

  /** Bytes typed by the user, consumed one per IN instruction. */
  pushInput(bytes: readonly number[]): void {
    this.input.push(...bytes.map((b) => b & 0xff));
    if (this._status === 'waiting') this._status = 'ready';
  }

  /** Console output produced since the last call. */
  takeOutput(): number[] {
    const out = this.outputBuffer;
    this.outputBuffer = [];
    return out;
  }

  step(): StepResult {
    if (this._status === 'empty') return { kind: 'fault', message: 'No program loaded' };
    if (this._status === 'halted') return { kind: 'halted' };
    if (this._status === 'fault')
      return { kind: 'fault', message: this._fault ?? 'FAULT. Reset to continue.' };

    this.currentLine = this.lineAt(this.cpu.ip);
    try {
      const outcome = this.cpu.step();
      if (outcome === 'waiting') {
        this._status = 'waiting';
        return { kind: 'waiting' };
      }
      this._steps++;
      if (outcome === 'halted') {
        this._status = 'halted';
        return { kind: 'halted' };
      }
      this._status = 'ready';
      return { kind: 'ok' };
    } catch (e) {
      if (!(e instanceof MachineFault)) throw e;
      this._status = 'fault';
      this._fault = e.message;
      return { kind: 'fault', message: e.message };
    }
  }

  /** Writes a byte directly (memory cell editor while paused). Not logged as a program write. */
  poke(address: number, value: number): void {
    if (address < 0 || address >= this.memory.data.length) return;
    this.memory.data[address] = value & 0xff;
  }

  capture(): MachineState {
    const c = this.cpu;
    return {
      gpr: [...c.gpr],
      sp: c.sp,
      ip: c.ip,
      zero: c.zero,
      carry: c.carry,
      fault: c.fault,
      memory: this.memory.data.slice(),
      lastAccess: this.memory.lastAccess,
      steps: this._steps,
      status: this._status,
      faultMessage: this._fault,
      input: [...this.input],
      writes: [...this._writes],
      totalWrites: this._totalWrites,
    };
  }

  restore(state: MachineState): void {
    const c = this.cpu;
    c.gpr = [...state.gpr];
    c.sp = state.sp;
    c.ip = state.ip;
    c.zero = state.zero;
    c.carry = state.carry;
    c.fault = state.fault;
    this.memory.data.set(state.memory);
    this.memory.lastAccess = state.lastAccess;
    this._steps = state.steps;
    this._status = state.status;
    this._fault = state.faultMessage;
    this.input = [...state.input];
    this._writes = [...state.writes];
    this._totalWrites = state.totalWrites;
  }

  snapshot(): MachineSnapshot {
    return {
      status: this._status,
      registers: this.cpu.registers(),
      memory: this.memory.data.slice(),
      lastAccess: this.memory.lastAccess,
      steps: this._steps,
      line: this.lineAt(this.cpu.ip),
      fault: this._fault,
      pendingInput: this.input.length,
    };
  }
}
