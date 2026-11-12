import {
  assemble,
  DISPLAY_START,
  hex,
  type Assembly,
  type BreakpointSpec,
  type MachineSnapshot,
  type MemoryWrite,
  type StopReason,
} from '@core/index';
import { speedLabel, type RunnerEvent, type RunnerPort, type RunState, type Speed } from '@app/run/protocol';

export type ConsoleKind = 'asm' | 'run' | 'out' | 'cpu' | 'err' | 'warn' | 'in' | 'tty' | 'fix';

export interface ConsoleEntry {
  readonly id: number;
  readonly kind: ConsoleKind;
  text: string;
  /** Raw bytes for program output (Hex view). */
  bytes?: number[];
  /** Right-aligned detail: time or a count. */
  meta?: string;
  /** Source line to reveal when the entry is clicked. */
  readonly line?: number;
  /** A tty line still receiving output. */
  open?: boolean;
}

export interface LoadedProgram {
  readonly path: string;
  readonly source: string;
  readonly assembly: Assembly;
}

const REGISTER_KEYS = ['A', 'B', 'C', 'D', 'IP', 'SP'] as const;
export type RegisterKey = (typeof REGISTER_KEYS)[number];

const clock = () => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
};

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);

const regValue = (s: MachineSnapshot, key: RegisterKey) =>
  key === 'IP' ? s.registers.ip : key === 'SP' ? s.registers.sp : s.registers.gpr['ABCD'.indexOf(key)]!;

/**
 * Container for one debugging session: talks to the runner (Web Worker), keeps the console log,
 * memory-write log, breakpoints and "changed since" marks the panels show.
 */
export class SessionState {
  state = $state<RunState>('empty');
  snapshot = $state.raw<MachineSnapshot | null>(null);
  program = $state.raw<LoadedProgram | null>(null);
  speed = $state<Speed>(4);
  lastStop = $state.raw<StopReason | null>(null);
  console = $state<ConsoleEntry[]>([]);
  writes = $state.raw<MemoryWrite[]>([]);
  /** Step at which each register last changed. */
  changedAt = $state<Record<RegisterKey, number>>({ A: 0, B: 0, C: 0, D: 0, IP: 0, SP: 0 });
  /** Registers that changed on the last step (for the "changed" mark). */
  changedNow = $state<RegisterKey[]>([]);
  /** Memory addresses written by the last step or run slice. */
  touched = $state.raw<ReadonlySet<number>>(new Set());
  breakpoints = $state<Record<string, BreakpointSpec[]>>({});
  pauseOnFault = $state(true);
  scrollback = $state(10_000);
  /** Bumped when the editor should reveal the current line. */
  revealTick = $state(0);

  private nextId = 1;
  private readonly unsubscribe: () => void;
  private undoAvailable = false;

  constructor(
    private readonly runner: RunnerPort,
    private readonly onProblems: (assembly: Assembly, path: string) => void = () => {},
  ) {
    this.unsubscribe = runner.subscribe((e) => this.onEvent(e));
  }

  dispose(): void {
    this.unsubscribe();
    this.runner.dispose();
  }

  // ---------- derived ----------

  get running(): boolean {
    return this.state === 'running' || this.state === 'waiting';
  }

  get currentLine(): number | undefined {
    return this.snapshot?.line;
  }

  breakpointsFor(path: string): BreakpointSpec[] {
    return this.breakpoints[path] ?? [];
  }

  // ---------- console ----------

  log(
    kind: ConsoleKind,
    text: string,
    extra: Partial<Omit<ConsoleEntry, 'id' | 'kind' | 'text'>> = {},
  ): void {
    this.closeTty();
    this.console.push({ id: this.nextId++, kind, text, ...extra });
    this.trimConsole();
  }

  private trimConsole(): void {
    const over = this.console.length - this.scrollback;
    if (over > 0) this.console.splice(0, over);
  }

  private closeTty(): void {
    const last = this.console[this.console.length - 1];
    if (last?.open) last.open = false;
  }

  private appendOutput(bytes: readonly number[]): void {
    for (const b of bytes) {
      let last = this.console[this.console.length - 1];
      if (!last?.open) {
        last = { id: this.nextId++, kind: 'tty', text: '', bytes: [], open: true };
        this.console.push(last);
        last = this.console[this.console.length - 1]!;
      }
      if (b === 10) {
        last.open = false;
        continue;
      }
      last.bytes!.push(b);
      last.text += b >= 32 && b < 127 ? String.fromCharCode(b) : b === 9 ? '\t' : '·';
    }
    this.trimConsole();
  }

  clearConsole(): void {
    this.console = [];
  }

  // ---------- program ----------

  /**
   * Assembles `source` and loads it into the runner. Returns false (and reports the problems)
   * when it does not assemble.
   */
  load(path: string, source: string): boolean {
    const assembly = assemble(source);
    const errors = assembly.diagnostics.filter((d) => d.severity === 'error');
    const labels = Object.keys(assembly.labels).length;
    this.log('asm', `assemble ${fileName(path)}`, { meta: clock() });
    this.log(
      'asm',
      `${assembly.code.length} bytes · ${labels} label${labels === 1 ? '' : 's'} · ${errors.length} problem${errors.length === 1 ? '' : 's'}`,
    );
    this.onProblems(assembly, path);
    if (!assembly.ok) {
      for (const e of errors.slice(0, 20)) {
        this.log('err', `${fileName(path)}:${e.line + 1}  ${e.message}`, { line: e.line });
      }
      return false;
    }
    this.program = { path, source, assembly };
    this.writes = [];
    this.runner.send({ type: 'load', assembly, breakpoints: $state.snapshot(this.breakpointsFor(path)) });
    // Optimistic: commands sent before the runner's reply must see the program as loaded.
    this.state = 'ready';
    return true;
  }

  /** True when the runner holds this exact source and can continue from where it is. */
  private canContinue(path: string, source: string): boolean {
    return (
      this.program?.path === path &&
      this.program.source === source &&
      (this.state === 'ready' || this.state === 'paused' || this.state === 'waiting')
    );
  }

  private ensureLoaded(path: string, source: string): boolean {
    if (this.canContinue(path, source)) return true;
    return this.load(path, source);
  }

  // ---------- commands ----------

  run(path: string, source: string): void {
    if (this.running) return;
    if (!this.ensureLoaded(path, source)) return;
    this.log('run', `Run started at ${speedLabel(this.speed)}`, { meta: clock() });
    this.runner.send({ type: 'run', speed: this.speed });
    this.state = 'running';
  }

  pause(): void {
    if (this.running) this.runner.send({ type: 'pause' });
  }

  step(path: string, source: string, kind: 'step' | 'stepOver' | 'stepOut' = 'step'): void {
    if (this.running) return;
    if (!this.ensureLoaded(path, source)) return;
    this.runner.send({ type: kind });
  }

  reset(): void {
    if (this.state === 'empty') return;
    this.undoAvailable = true;
    this.runner.send({ type: 'reset' });
  }

  undoReset(): void {
    if (!this.undoAvailable) return;
    this.undoAvailable = false;
    this.runner.send({ type: 'undoReset' });
  }

  /** Stop = reset without undo (Run and debug "Stop"). */
  stop(): void {
    if (this.state === 'empty') return;
    this.undoAvailable = false;
    this.runner.send({ type: 'reset', keepUndo: false });
  }

  /** Reload the program from scratch and run it, even while a run is in progress. */
  restart(path: string, source: string): void {
    this.undoAvailable = false;
    // `load` stops any running clock in the runner before anything else happens.
    if (!this.load(path, source)) return;
    this.log('run', `Run started at ${speedLabel(this.speed)}`, { meta: clock() });
    this.runner.send({ type: 'run', speed: this.speed });
  }

  /** A file was renamed: breakpoints and the loaded program follow it. */
  renamePath(from: string, to: string): void {
    const move = (p: string) => (p === from || p.startsWith(from + '/') ? to + p.slice(from.length) : p);
    const next: Record<string, BreakpointSpec[]> = {};
    for (const [p, list] of Object.entries(this.breakpoints)) next[move(p)] = list;
    this.breakpoints = next;
    if (this.program) this.program = { ...this.program, path: move(this.program.path) };
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
    this.runner.send({ type: 'speed', speed });
  }

  sendInput(text: string): void {
    const bytes = [...text].map((c) => c.charCodeAt(0) & 0xff);
    if (bytes.length) this.runner.send({ type: 'input', bytes });
  }

  poke(address: number, value: number): void {
    this.runner.send({ type: 'poke', address, value });
  }

  // ---------- breakpoints ----------

  setBreakpoints(path: string, specs: BreakpointSpec[]): void {
    this.breakpoints[path] = specs;
    if (this.program?.path === path)
      this.runner.send({ type: 'breakpoints', breakpoints: $state.snapshot(specs) });
  }

  toggleBreakpoint(path: string, line: number): void {
    const list = this.breakpointsFor(path);
    const exists = list.some((b) => b.line === line);
    this.setBreakpoints(path, exists ? list.filter((b) => b.line !== line) : [...list, { line }]);
  }

  updateBreakpoint(path: string, line: number, patch: Partial<BreakpointSpec>): void {
    this.setBreakpoints(
      path,
      this.breakpointsFor(path).map((b) => (b.line === line ? { ...b, ...patch } : b)),
    );
  }

  clearBreakpoints(): void {
    for (const path of Object.keys(this.breakpoints)) this.setBreakpoints(path, []);
  }

  // ---------- runner events ----------

  private onEvent(e: RunnerEvent): void {
    const prev = this.snapshot;
    const next = e.snapshot;

    if (e.restarted) {
      this.writes = [];
      this.changedNow = [];
      this.changedAt = { A: 0, B: 0, C: 0, D: 0, IP: 0, SP: 0 };
    }
    if (e.restored && e.allWrites) this.writes = [...e.allWrites];
    else if (e.writes.length) {
      const merged = this.writes.concat(e.writes);
      this.writes = merged.length > 10_000 ? merged.slice(merged.length - 10_000) : merged;
    }
    this.touched = new Set(e.writes.map((w) => w.address));

    if (prev && !e.restarted) {
      const changed = REGISTER_KEYS.filter((k) => regValue(prev, k) !== regValue(next, k));
      this.changedNow = changed;
      for (const k of changed) this.changedAt[k] = next.steps;
    }

    if (e.output.length) this.appendOutput(e.output);
    this.snapshot = next;
    this.state = e.state;

    if (e.stop) {
      this.lastStop = e.stop;
      this.describeStop(e.stop, next);
      this.revealTick++;
    }
  }

  private describeStop(stop: StopReason, s: MachineSnapshot): void {
    const ip = `0x${hex(s.registers.ip)}`;
    const lineNote = (prefix: string) => (s.line !== undefined ? ` (${prefix}line ${s.line + 1})` : '');
    const file = this.program ? fileName(this.program.path) : '';
    switch (stop.kind) {
      case 'halted': {
        const display = this.displayText(s);
        if (display) this.log('out', display, { meta: `${display.length} chars` });
        this.log('cpu', `Halted at ${ip}${lineNote('HLT, ')} after ${s.steps} steps`, {
          meta: clock(),
          ...(s.line !== undefined ? { line: s.line } : {}),
        });
        break;
      }
      case 'breakpoint':
        this.log(
          'cpu',
          `Paused at breakpoint ${file}:${stop.line + 1} (0x${hex(s.registers.ip)}) · step ${s.steps}`,
          {
            meta: clock(),
            line: stop.line,
          },
        );
        break;
      case 'fault':
        this.log('err', `${stop.message} at 0x${hex(s.faultAddress ?? s.registers.ip)}${lineNote('')}`, {
          meta: clock(),
          ...(s.line !== undefined ? { line: s.line } : {}),
        });
        break;
      case 'condition-error':
        this.log('err', `Breakpoint condition on line ${stop.line + 1}: ${stop.message}`, {
          line: stop.line,
        });
        break;
      default:
        break;
    }
  }

  /** Text on the 24-byte memory-mapped display, trimmed; empty when nothing was written there. */
  displayText(s: MachineSnapshot | null = this.snapshot): string {
    if (!s) return '';
    const bytes = s.memory.slice(DISPLAY_START);
    if (bytes.every((b) => b === 0)) return '';
    return String.fromCharCode(...bytes.map((b) => (b >= 32 && b < 127 ? b : 32))).trimEnd();
  }
}
