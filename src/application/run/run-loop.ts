import { Debugger, Machine, type MachineState, type StopReason } from '@core/index';
import type { RunnerCommand, RunnerEvent, RunState, Speed } from './protocol';

/** Injected clock so the loop runs the same in a Web Worker, on the main thread and in tests. */
export interface Timer {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
  now(): number;
}

export const realTimer: Timer = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  now: () => performance.now(),
};

/** At Max speed: how long one slice may run before yielding, and how often the UI hears about it. */
export const MAX_SLICE_MS = 12;
export const SNAPSHOT_EVERY_MS = 100;
const STEPS_PER_CHECK = 2048;
/** Hard cap per Max slice, in case the clock is coarse or frozen. */
const MAX_CHECKS_PER_SLICE = 64;
/** Steps allowed for one step over / step out before it is treated as a run (so a loop cannot hang). */
const STEP_BUDGET = 5000;

/**
 * Drives a Machine + Debugger on a clock. It is the only stateful piece of the runtime: commands
 * come in, `RunnerEvent`s go out. Hosted by the Web Worker in the app and run inline in tests.
 */
export class RunLoop {
  private readonly machine = new Machine();
  private readonly debugger = new Debugger(this.machine);
  private state: RunState = 'empty';
  private speed: Speed = 4;
  private handle: unknown = null;
  /** Mode of the scheduled tick; kept when a speed change reschedules it before it runs. */
  private pendingMode: 'fresh' | 'after-input' | 'resume' = 'resume';
  private sentWrites = 0;
  private lastSnapshotAt = 0;
  /** The state to return to after IN receives input. */
  private resumeAfterInput: 'running' | 'paused' = 'paused';
  private beforeReset: { machine: MachineState; state: RunState } | null = null;

  constructor(
    private readonly emit: (event: RunnerEvent) => void,
    private readonly timer: Timer = realTimer,
  ) {}

  handleCommand(command: RunnerCommand): void {
    switch (command.type) {
      case 'load':
        this.stopTimer();
        this.beforeReset = null;
        this.machine.load(command.assembly);
        this.debugger.setBreakpoints(command.breakpoints);
        this.sentWrites = 0;
        this.state = command.assembly.ok ? 'ready' : 'empty';
        this.publish(undefined, true);
        break;
      case 'reset':
        this.stopTimer();
        this.beforeReset =
          command.keepUndo === false
            ? null
            : {
                machine: this.machine.capture(),
                state: this.state === 'running' || this.state === 'waiting' ? 'paused' : this.state,
              };
        this.machine.reset();
        this.debugger.resetHits();
        this.sentWrites = 0;
        this.state = this.machine.status === 'empty' ? 'empty' : 'ready';
        this.publish(undefined, true);
        break;
      case 'undoReset':
        if (this.beforeReset && this.state === 'ready') {
          this.machine.restore(this.beforeReset.machine);
          this.state = this.beforeReset.state;
          this.sentWrites = this.machine.totalWrites;
          this.beforeReset = null;
          this.publish(undefined, false, true);
        }
        break;
      case 'run':
        this.speed = command.speed;
        this.start();
        break;
      case 'speed':
        this.speed = command.speed;
        if (this.state === 'running') {
          const mode = this.pendingMode;
          this.stopTimer();
          this.schedule(0, mode);
        }
        break;
      case 'pause':
        if (this.state === 'running' || this.state === 'waiting') {
          this.stopTimer();
          this.debugger.cancel();
          this.state = 'paused';
          this.publish({ kind: 'step' });
        }
        break;
      case 'step':
        this.manualStep(() => this.debugger.step());
        break;
      case 'stepOver':
        this.manualStep(() => this.debugger.stepOver(STEP_BUDGET));
        break;
      case 'stepOut':
        this.manualStep(() => this.debugger.stepOut(STEP_BUDGET));
        break;
      case 'input':
        this.machine.pushInput(command.bytes);
        if (this.state === 'waiting') {
          if (this.resumeAfterInput === 'running') {
            this.state = 'running';
            this.publish();
            this.schedule(0, 'after-input');
          } else {
            this.state = 'paused';
            this.publish();
          }
        } else {
          this.publish();
        }
        break;
      case 'breakpoints':
        this.debugger.setBreakpoints(command.breakpoints);
        break;
      case 'poke':
        if (this.state !== 'running') {
          this.machine.poke(command.address, command.value);
          this.publish();
        }
        break;
    }
  }

  dispose(): void {
    this.stopTimer();
  }

  private canRun(): boolean {
    return this.state === 'ready' || this.state === 'paused' || this.state === 'waiting';
  }

  private start(): void {
    if (!this.canRun() && this.state !== 'running') return;
    if (this.state === 'running') return;
    // A continue that stopped on IN keeps its goal; anything else starts a new one.
    const mode = this.state === 'waiting' && this.debugger.busy ? 'after-input' : 'fresh';
    this.state = 'running';
    this.resumeAfterInput = 'running';
    this.lastSnapshotAt = this.timer.now();
    this.publish();
    this.schedule(0, mode);
  }

  private manualStep(run: () => StopReason): void {
    if (this.state === 'running') return;
    if (!this.canRun()) return;
    this.resumeAfterInput = 'paused';
    const stop = run();
    this.finish(stop.kind === 'budget' ? { kind: 'step' } : stop);
  }

  private schedule(ms: number, mode: 'fresh' | 'after-input' | 'resume' = 'resume'): void {
    this.pendingMode = mode;
    this.handle = this.timer.set(() => {
      this.handle = null;
      this.pendingMode = 'resume';
      this.tick(mode);
    }, ms);
  }

  private stopTimer(): void {
    if (this.handle !== null) this.timer.clear(this.handle);
    this.handle = null;
  }

  private tick(mode: 'fresh' | 'after-input' | 'resume'): void {
    if (this.state !== 'running') return;

    if (this.speed !== 'max') {
      // One instruction per clock tick; the UI sees every step.
      const stop =
        mode === 'fresh'
          ? this.debugger.continue(1)
          : mode === 'after-input'
            ? this.debugger.resumeAfterInput(1)
            : this.debugger.resume(1);
      if (stop.kind === 'budget') {
        this.publish();
        this.schedule(1000 / this.speed);
      } else {
        this.finish(stop);
      }
      return;
    }

    // Max: run in time-boxed slices, publish at most every 100 ms.
    const started = this.timer.now();
    let stop: StopReason =
      mode === 'fresh'
        ? this.debugger.continue(STEPS_PER_CHECK)
        : mode === 'after-input'
          ? this.debugger.resumeAfterInput(STEPS_PER_CHECK)
          : this.debugger.resume(STEPS_PER_CHECK);
    for (
      let checks = 1;
      stop.kind === 'budget' && checks < MAX_CHECKS_PER_SLICE && this.timer.now() - started < MAX_SLICE_MS;
      checks++
    ) {
      stop = this.debugger.resume(STEPS_PER_CHECK);
    }
    if (stop.kind !== 'budget') {
      this.finish(stop);
      return;
    }
    const now = this.timer.now();
    if (now - this.lastSnapshotAt >= SNAPSHOT_EVERY_MS) {
      this.lastSnapshotAt = now;
      this.publish();
    }
    this.schedule(0);
  }

  private finish(stop: StopReason): void {
    this.stopTimer();
    switch (stop.kind) {
      case 'halted':
        this.state = 'halted';
        break;
      case 'fault':
        this.state = 'fault';
        break;
      case 'waiting':
        this.state = 'waiting';
        break;
      default:
        this.state = 'paused';
    }
    this.publish(stop);
  }

  private publish(stop?: StopReason, restarted = false, restored = false): void {
    const all = this.machine.writes;
    const fresh = Math.min(this.machine.totalWrites - this.sentWrites, all.length);
    this.sentWrites = this.machine.totalWrites;
    this.emit({
      type: 'update',
      state: this.state,
      snapshot: this.machine.snapshot(),
      output: this.machine.takeOutput(),
      ...((dropped) => (dropped ? { outputDropped: dropped } : {}))(this.machine.takeDropped()),
      writes: fresh > 0 ? all.slice(all.length - fresh) : [],
      ...(stop ? { stop } : {}),
      ...(restarted ? { restarted } : {}),
      ...(restored ? { restored, allWrites: [...all] } : {}),
    });
  }
}
