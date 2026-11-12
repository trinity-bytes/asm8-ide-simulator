import type { Assembly, BreakpointSpec, MachineSnapshot, MemoryWrite, StopReason } from '@core/index';

/** Clock speeds offered in the Speed menu. `max` runs as fast as possible. */
export type Speed = 1 | 4 | 16 | 64 | 'max';
export const SPEEDS: readonly Speed[] = [1, 4, 16, 64, 'max'];
export const speedLabel = (s: Speed): string => (s === 'max' ? 'Max' : `${s} Hz`);
export const isSpeed = (v: unknown): v is Speed => SPEEDS.includes(v as Speed);

/**
 * What the run session is doing.
 * - `empty`: no program loaded.  - `ready`: loaded (or reset), not started.
 * - `running`  - `paused`: stopped by the user, a breakpoint or a step.
 * - `waiting`: running but blocked on IN until the user types.
 * - `halted`: HLT reached.  - `fault`: runtime error.
 */
export type RunState = 'empty' | 'ready' | 'running' | 'paused' | 'waiting' | 'halted' | 'fault';

/** Commands the UI sends to the runner (over postMessage, so plain data only). */
export type RunnerCommand =
  | { readonly type: 'load'; readonly assembly: Assembly; readonly breakpoints: readonly BreakpointSpec[] }
  | { readonly type: 'run'; readonly speed: Speed }
  | { readonly type: 'pause' }
  | { readonly type: 'step' }
  | { readonly type: 'stepOver' }
  | { readonly type: 'stepOut' }
  | { readonly type: 'reset' }
  /** Puts back the state from just before the last reset (Undo in the reset toast). */
  | { readonly type: 'undoReset' }
  | { readonly type: 'speed'; readonly speed: Speed }
  | { readonly type: 'input'; readonly bytes: readonly number[] }
  | { readonly type: 'breakpoints'; readonly breakpoints: readonly BreakpointSpec[] }
  | { readonly type: 'poke'; readonly address: number; readonly value: number };

/** One update from the runner: the new state plus everything that happened since the last one. */
export interface RunnerUpdate {
  readonly type: 'update';
  readonly state: RunState;
  readonly snapshot: MachineSnapshot;
  /** Bytes written by OUT since the previous update. */
  readonly output: readonly number[];
  /** Memory writes since the previous update (oldest first). */
  readonly writes: readonly MemoryWrite[];
  /** Why the run stopped, when this update ends a run or a step. */
  readonly stop?: StopReason;
  /** Set when the update follows a `reset` or `load` (the UI clears its logs). */
  readonly restarted?: boolean;
  /** Set after `undoReset`; `allWrites` then replaces the UI's write log. */
  readonly restored?: boolean;
  readonly allWrites?: readonly MemoryWrite[];
}

export type RunnerEvent = RunnerUpdate;

/** Port: something that executes RunnerCommands and reports RunnerEvents (a worker or inline). */
export interface RunnerPort {
  send(command: RunnerCommand): void;
  subscribe(listener: (event: RunnerEvent) => void): () => void;
  dispose(): void;
}
