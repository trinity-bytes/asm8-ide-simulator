import { Opcode } from '../isa/opcodes';
import type { Machine } from '../machine/machine';
import { compileCondition, ConditionError, type Condition, type ConditionContext } from './condition';

export interface BreakpointSpec {
  /** 0-based source line. */
  readonly line: number;
  readonly enabled?: boolean;
  /** Pause only when this expression is non-zero, e.g. `A == 0x41`. */
  readonly condition?: string;
  /** Pause from the N-th time the line is reached (1 = every time). */
  readonly hitCount?: number;
}

/** Why a run stopped. `budget` means "still running, give control back to the scheduler". */
export type StopReason =
  | { readonly kind: 'step' }
  | { readonly kind: 'budget' }
  | { readonly kind: 'halted' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'breakpoint'; readonly line: number }
  | { readonly kind: 'fault'; readonly message: string }
  | { readonly kind: 'condition-error'; readonly line: number; readonly message: string };

interface ArmedBreakpoint {
  readonly spec: BreakpointSpec;
  readonly condition: Condition | null;
  readonly conditionError: string | null;
  hits: number;
}

/** What the user asked for; kept across scheduler slices of a long run. */
type Goal =
  | { readonly kind: 'continue' }
  | { readonly kind: 'over'; readonly returnTo: number; readonly sp: number }
  | { readonly kind: 'out'; readonly sp: number };

/**
 * Debugger rules on top of a Machine: breakpoints (with condition and hit count), step, step over
 * a CALL, step out of the current routine. Pure and synchronous; a scheduler (Web Worker or a test)
 * calls `run(budget)` repeatedly while the result is `budget`.
 */
export class Debugger {
  private breakpoints = new Map<number, ArmedBreakpoint>();
  private goal: Goal | null = null;
  private readonly ctx: ConditionContext;

  constructor(private readonly machine: Machine) {
    const cpu = machine.cpu;
    this.ctx = {
      register: (name) => {
        switch (name) {
          case 'SP':
            return cpu.sp;
          case 'IP':
            return cpu.ip;
          default:
            return cpu.gpr['ABCD'.indexOf(name)]!;
        }
      },
      flag: (name) => (name === 'Z' ? cpu.zero : cpu.carry),
      memory: (address) => machine.memory.data[address & 0xff]!,
    };
  }

  /** Replaces all breakpoints. Hit counters restart. */
  setBreakpoints(specs: readonly BreakpointSpec[]): void {
    this.breakpoints.clear();
    for (const spec of specs) {
      if (spec.enabled === false) continue;
      let condition: Condition | null = null;
      let conditionError: string | null = null;
      if (spec.condition?.trim()) {
        try {
          condition = compileCondition(spec.condition);
        } catch (e) {
          conditionError = e instanceof ConditionError ? e.message : String(e);
        }
      }
      this.breakpoints.set(spec.line, { spec, condition, conditionError, hits: 0 });
    }
  }

  /** Validates a condition without arming it (for the breakpoint editor). */
  static checkCondition(src: string): string | null {
    try {
      compileCondition(src);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  resetHits(): void {
    for (const bp of this.breakpoints.values()) bp.hits = 0;
    this.goal = null;
  }

  /** Runs exactly one instruction. */
  step(): StopReason {
    this.goal = null;
    return this.single() ?? { kind: 'step' };
  }

  /** Like step, but a CALL runs to its return. Then call `run` until it is not `budget`. */
  stepOver(budget: number): StopReason {
    const { cpu, memory } = this.machine;
    const opcode = memory.data[cpu.ip];
    if (opcode !== Opcode.CALL_ADDRESS && opcode !== Opcode.CALL_REGADDRESS) return this.step();
    this.goal = { kind: 'over', returnTo: cpu.ip + 2, sp: cpu.sp };
    return this.run(budget, true);
  }

  /** Runs until the current routine returns (a RET that leaves SP above its current value). */
  stepOut(budget: number): StopReason {
    this.goal = { kind: 'out', sp: this.machine.cpu.sp };
    return this.run(budget, true);
  }

  /** Continue until a breakpoint, HLT, a fault, IN without input, or the goal is reached. */
  continue(budget: number): StopReason {
    this.goal = { kind: 'continue' };
    return this.run(budget, true);
  }

  /** Resumes the current goal for another slice. */
  resume(budget: number): StopReason {
    if (!this.goal) return { kind: 'step' };
    return this.run(budget, false);
  }

  /** Resumes a goal that stopped on IN without input (the IN line was already checked). */
  resumeAfterInput(budget: number): StopReason {
    if (!this.goal) return { kind: 'step' };
    return this.run(budget, true);
  }

  /** True while a continue / step over / step out is in progress. */
  get busy(): boolean {
    return this.goal !== null;
  }

  /** Drops the current goal (pause). */
  cancel(): void {
    this.goal = null;
  }

  private run(budget: number, first: boolean): StopReason {
    const goal = this.goal;
    if (!goal) return { kind: 'step' };
    const cpu = this.machine.cpu;
    for (let i = 0; i < budget; i++) {
      // A breakpoint on the line we are resuming from must not stop us again immediately.
      if (!(first && i === 0)) {
        const hit = this.checkBreakpoint();
        if (hit) {
          this.goal = null;
          return hit;
        }
      }
      const wasRet = this.machine.memory.data[cpu.ip] === Opcode.RET;
      const stop = this.single();
      if (stop) {
        // IN without input keeps the goal so typing resumes the same run.
        if (stop.kind !== 'waiting') this.goal = null;
        return stop;
      }
      if (goal.kind === 'over' && cpu.ip === goal.returnTo && cpu.sp === goal.sp) {
        this.goal = null;
        return { kind: 'step' };
      }
      if (goal.kind === 'out' && wasRet && cpu.sp > goal.sp) {
        this.goal = null;
        return { kind: 'step' };
      }
    }
    return { kind: 'budget' };
  }

  private single(): StopReason | null {
    const result = this.machine.step();
    switch (result.kind) {
      case 'ok':
        return null;
      case 'halted':
        return { kind: 'halted' };
      case 'waiting':
        return { kind: 'waiting' };
      case 'fault':
        return { kind: 'fault', message: result.message };
    }
  }

  private checkBreakpoint(): StopReason | null {
    const line = this.machine.lineAt(this.machine.cpu.ip);
    if (line === undefined) return null;
    const bp = this.breakpoints.get(line);
    if (!bp) return null;
    if (bp.conditionError) return { kind: 'condition-error', line, message: bp.conditionError };
    if (bp.condition && bp.condition(this.ctx) === 0) return null;
    bp.hits++;
    if (bp.hits < (bp.spec.hitCount ?? 1)) return null;
    return { kind: 'breakpoint', line };
  }
}
