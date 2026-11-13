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
import { translateCoreMessage } from '../i18n/core-messages';
import { i18n, t, tn } from '../i18n/i18n.svelte';

export type ConsoleKind = 'asm' | 'run' | 'out' | 'cpu' | 'err' | 'warn' | 'in' | 'tty' | 'fix';

export interface ConsoleEntry {
  readonly id: number;
  readonly kind: ConsoleKind;
  readonly text: string;
  /** Raw bytes for program output (Hex view). */
  readonly bytes?: readonly number[];
  /** Right-aligned detail: time or a count. */
  readonly meta?: string;
  /** Source line to reveal when the entry is clicked. */
  readonly line?: number;
  /** A tty line still receiving output. */
  readonly open?: boolean;
}

/** Console text: a string, or a function so translated notices follow the current language. */
type LogText = string | (() => string);

/** Entry whose `text`/`meta` are getters when given as functions (entries live in `$state.raw`). */
function makeEntry(
  id: number,
  kind: ConsoleKind,
  text: LogText,
  extra: Partial<Omit<ConsoleEntry, 'id' | 'kind' | 'text' | 'meta'>> & { meta?: LogText },
): ConsoleEntry {
  const { meta, ...rest } = extra;
  const entry = { id, kind, ...rest } as { -readonly [K in keyof ConsoleEntry]: ConsoleEntry[K] };
  if (typeof text === 'function') Object.defineProperty(entry, 'text', { get: text, enumerable: true });
  else entry.text = text;
  if (typeof meta === 'function') Object.defineProperty(entry, 'meta', { get: meta, enumerable: true });
  else if (meta !== undefined) entry.meta = meta;
  return entry;
}

/** Snapshot with its fault message in the current language (same object when unchanged). */
function localSnapshot(s: MachineSnapshot | null): MachineSnapshot | null {
  if (!s?.fault) return s;
  const fault = translateCoreMessage(s.fault);
  return fault === s.fault ? s : { ...s, fault };
}

function localStop(stop: StopReason | null): StopReason | null {
  if (!stop || (stop.kind !== 'fault' && stop.kind !== 'condition-error')) return stop;
  const message = translateCoreMessage(stop.message);
  return message === stop.message ? stop : { ...stop, message };
}

export interface LoadedProgram {
  readonly path: string;
  readonly source: string;
  readonly assembly: Assembly;
}

const REGISTER_KEYS = ['A', 'B', 'C', 'D', 'IP', 'SP'] as const;
/** Characters per console line before program output wraps into the next entry. */
export const MAX_LINE = 4096;
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
  private rawSnapshot = $state.raw<MachineSnapshot | null>(null);
  private readonly localSnapshot = $derived(localSnapshot(this.rawSnapshot));
  program = $state.raw<LoadedProgram | null>(null);
  speed = $state<Speed>(4);
  private rawStop = $state.raw<StopReason | null>(null);
  private readonly localStop = $derived(localStop(this.rawStop));
  console = $state.raw<ConsoleEntry[]>([]);
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

  /** Latest machine snapshot; its fault message follows the current language. */
  get snapshot(): MachineSnapshot | null {
    return this.localSnapshot;
  }
  set snapshot(value: MachineSnapshot | null) {
    this.rawSnapshot = value;
  }

  /** Why the last run stopped; fault and condition messages follow the current language. */
  get lastStop(): StopReason | null {
    return this.localStop;
  }
  set lastStop(value: StopReason | null) {
    this.rawStop = value;
  }

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
    text: LogText,
    extra: Partial<Omit<ConsoleEntry, 'id' | 'kind' | 'text' | 'meta'>> & { meta?: LogText } = {},
  ): void {
    const next = this.closedTty();
    next.push(makeEntry(this.nextId++, kind, text, extra));
    this.console = this.trimmed(next);
  }

  /** Keeps the newest `scrollback` lines. */
  private trimmed(list: ConsoleEntry[]): ConsoleEntry[] {
    return list.length > this.scrollback ? list.slice(list.length - this.scrollback) : list;
  }

  /** Copy of the console with the live tty line closed (entries are immutable). */
  private closedTty(): ConsoleEntry[] {
    const list = this.console.slice();
    const last = list[list.length - 1];
    if (last?.open) list[list.length - 1] = { ...last, open: false };
    return list;
  }

  /**
   * Appends program output in one batch. At Max speed one update can carry thousands of lines, so
   * this builds plain objects and assigns the console once (never mutates entries in place).
   */
  private appendOutput(bytes: readonly number[]): void {
    const list = this.console.slice();
    const lastEntry = list[list.length - 1];
    let current: { text: string[]; bytes: number[] } | null = null;
    let currentId = 0;
    if (lastEntry?.open) {
      list.pop();
      current = { text: [lastEntry.text], bytes: lastEntry.bytes ? lastEntry.bytes.slice() : [] };
      currentId = lastEntry.id;
    }
    const flush = (open: boolean) => {
      if (!current) return;
      list.push({ id: currentId, kind: 'tty', text: current.text.join(''), bytes: current.bytes, open });
      current = null;
    };
    for (const b of bytes) {
      if (b === 10) {
        if (!current) {
          current = { text: [], bytes: [] };
          currentId = this.nextId++;
        }
        flush(false);
        continue;
      }
      if (!current) {
        current = { text: [], bytes: [] };
        currentId = this.nextId++;
      }
      current.bytes.push(b);
      current.text.push(b >= 32 && b < 127 ? String.fromCharCode(b) : b === 9 ? '\t' : '·');
      // Very long lines wrap into a new entry so one endless line cannot grow without bound.
      if (current.bytes.length >= MAX_LINE) flush(false);
    }
    flush(true);
    this.console = this.trimmed(list);
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
    const file = fileName(path);
    this.log('asm', () => t('state.console.assemble', { file }), { meta: clock() });
    this.log('asm', () =>
      t('state.console.summary', {
        bytes: tn('state.console.bytes', assembly.code.length),
        labels: tn('state.console.labels', labels),
        problems: tn('state.console.problems', errors.length),
      }),
    );
    this.onProblems(assembly, path);
    if (!assembly.ok) {
      for (const e of errors.slice(0, 20)) {
        this.log('err', () => `${file}:${e.line + 1}  ${translateCoreMessage(e.message)}`, { line: e.line });
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
    const speed = speedLabel(this.speed);
    this.log('run', () => t('state.console.runStarted', { speed }), { meta: clock() });
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
    const speed = speedLabel(this.speed);
    this.log('run', () => t('state.console.runStarted', { speed }), { meta: clock() });
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

    if (e.outputDropped) {
      const dropped = e.outputDropped;
      this.log('warn', () => t('state.console.outputDropped', { n: dropped.toLocaleString(i18n.locale) }));
    }
    if (e.output.length) this.appendOutput(e.output);
    this.rawSnapshot = next;
    this.state = e.state;

    if (e.stop) {
      this.rawStop = e.stop;
      this.describeStop(e.stop, next);
      this.revealTick++;
    }
  }

  private describeStop(stop: StopReason, s: MachineSnapshot): void {
    const ip = `0x${hex(s.registers.ip)}`;
    const at = s.line;
    const lineNote = (key: 'state.console.lineNote' | 'state.console.hltLineNote') =>
      at !== undefined ? t(key, { line: at + 1 }) : '';
    const file = this.program ? fileName(this.program.path) : '';
    switch (stop.kind) {
      case 'halted': {
        const display = this.displayText(s);
        if (display)
          this.log('out', display, { meta: () => t('state.console.chars', { n: display.length }) });
        const steps = s.steps;
        this.log(
          'cpu',
          () => t('state.console.halted', { ip, note: lineNote('state.console.hltLineNote'), steps }),
          {
            meta: clock(),
            ...(s.line !== undefined ? { line: s.line } : {}),
          },
        );
        break;
      }
      case 'breakpoint':
        this.log(
          'cpu',
          () => t('state.console.breakpoint', { file, line: stop.line + 1, ip, steps: s.steps }),
          {
            meta: clock(),
            line: stop.line,
          },
        );
        break;
      case 'fault': {
        const address = `0x${hex(s.faultAddress ?? s.registers.ip)}`;
        const message = stop.message;
        const text = () =>
          t('state.console.fault', {
            message: translateCoreMessage(message),
            address,
            note: lineNote('state.console.lineNote'),
          });
        this.log('err', text, {
          meta: clock(),
          ...(s.line !== undefined ? { line: s.line } : {}),
        });
        break;
      }
      case 'condition-error': {
        const { line, message } = stop;
        this.log(
          'err',
          () => t('state.console.conditionError', { line: line + 1, message: translateCoreMessage(message) }),
          {
            line,
          },
        );
        break;
      }
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
