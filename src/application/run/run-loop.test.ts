import { describe, expect, it } from 'vitest';
import { assemble } from '@core/index';
import type { RunnerEvent } from './protocol';
import { RunLoop, type Timer } from './run-loop';

/** Manual clock: `advance(ms)` fires due timers in order. */
function fakeTimer() {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const timer: Timer = {
    set: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clear: (h) => void timers.delete(h as number),
    now: () => now,
  };
  /** Moves the clock and fires, once, every timer that is due (timers they create wait for the next call). */
  const advance = (ms: number) => {
    now += ms;
    const due = [...timers.entries()].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at);
    for (const [id, t] of due) {
      timers.delete(id);
      t.fn();
    }
  };
  /** Advances in small ticks so chained timers keep firing. */
  const run = (ms: number, tick = 10) => {
    for (let t = 0; t < ms; t += tick) advance(tick);
  };
  return { timer, advance, run, pending: () => timers.size };
}

const setup = (src: string) => {
  const events: RunnerEvent[] = [];
  const clock = fakeTimer();
  const loop = new RunLoop((e) => events.push(e), clock.timer);
  loop.handleCommand({ type: 'load', assembly: assemble(src), breakpoints: [] });
  return { loop, events, clock, last: () => events[events.length - 1]! };
};

const ECHO = 'loop: IN A\nOUT A\nJMP loop';

describe('RunLoop', () => {
  it('load publishes a ready snapshot flagged as a restart', () => {
    const { last } = setup('HLT');
    expect(last()).toMatchObject({ type: 'update', state: 'ready', restarted: true });
  });

  it('runs one instruction per tick at 4 Hz and reports the halt', () => {
    const { loop, clock, last } = setup('MOV A, 1\nMOV B, 2\nHLT');
    loop.handleCommand({ type: 'run', speed: 4 });
    expect(last().state).toBe('running');
    clock.advance(0);
    expect(last().snapshot.registers.gpr[0]).toBe(1);
    clock.advance(250);
    expect(last().snapshot.registers.gpr[1]).toBe(2);
    clock.advance(250);
    expect(last()).toMatchObject({ state: 'halted', stop: { kind: 'halted' } });
    expect(last().snapshot.steps).toBe(3);
    expect(clock.pending()).toBe(0);
  });

  it('pause stops the clock; step runs one instruction', () => {
    const { loop, clock, last } = setup('MOV A, 1\nMOV A, 2\nMOV A, 3\nHLT');
    loop.handleCommand({ type: 'run', speed: 1 });
    clock.advance(0);
    loop.handleCommand({ type: 'pause' });
    expect(last().state).toBe('paused');
    clock.advance(5000);
    expect(last().snapshot.registers.gpr[0]).toBe(1);
    loop.handleCommand({ type: 'step' });
    expect(last()).toMatchObject({ state: 'paused', stop: { kind: 'step' } });
    expect(last().snapshot.registers.gpr[0]).toBe(2);
  });

  it('stops at a breakpoint and reports its line', () => {
    const { loop, clock, last } = setup('MOV A, 1\nMOV A, 2\nHLT');
    loop.handleCommand({ type: 'breakpoints', breakpoints: [{ line: 1 }] });
    loop.handleCommand({ type: 'run', speed: 64 });
    clock.run(1000);
    expect(last()).toMatchObject({ state: 'paused', stop: { kind: 'breakpoint', line: 1 } });
  });

  it('waits for input while running and resumes the run when keys arrive', () => {
    const { loop, clock, last, events } = setup(ECHO);
    loop.handleCommand({ type: 'run', speed: 16 });
    clock.run(10);
    expect(last().state).toBe('waiting');
    loop.handleCommand({ type: 'input', bytes: [104, 105] });
    expect(last().state).toBe('running');
    clock.run(1000);
    const out = events.flatMap((e) => e.output);
    expect(String.fromCharCode(...out)).toBe('hi');
    expect(last().state).toBe('waiting');
  });

  it('at Max speed publishes at most every 100 ms and still honours pause', () => {
    const { loop, clock, events, last } = setup('loop: INC A\nJMP loop');
    loop.handleCommand({ type: 'run', speed: 'max' });
    const before = events.length;
    // Each slice reschedules itself at +0 ms; run 20 slices one by one, 13 ms apart.
    for (let i = 0; i < 12; i++) {
      clock.advance(13);
    }
    const published = events.length - before;
    expect(published).toBeLessThanOrEqual(2);
    expect(last().snapshot.steps).toBeGreaterThan(10_000);
    loop.handleCommand({ type: 'pause' });
    expect(last().state).toBe('paused');
    expect(clock.pending()).toBe(0);
  });

  it('sends memory writes and console output as deltas', () => {
    const { loop, last } = setup("MOV [200], 1\nMOV A, 'x'\nOUT A\nMOV [201], 2\nHLT");
    loop.handleCommand({ type: 'step' });
    expect(last().writes).toHaveLength(1);
    loop.handleCommand({ type: 'step' });
    expect(last().writes).toHaveLength(0);
    loop.handleCommand({ type: 'step' });
    expect(last().output).toEqual([120]);
    loop.handleCommand({ type: 'step' });
    expect(last().writes).toMatchObject([{ address: 201, value: 2 }]);
  });

  it('reset returns to ready with a restart flag; a fault stops with its message', () => {
    const { loop, last } = setup('DIV 0');
    loop.handleCommand({ type: 'step' });
    expect(last()).toMatchObject({ state: 'fault', stop: { kind: 'fault', message: 'Division by 0' } });
    loop.handleCommand({ type: 'run', speed: 4 });
    expect(last().state).toBe('fault');
    loop.handleCommand({ type: 'reset' });
    expect(last()).toMatchObject({ state: 'ready', restarted: true });
  });

  it('poke edits memory while paused but not while running', () => {
    const { loop, clock, last } = setup('loop: JMP loop');
    loop.handleCommand({ type: 'poke', address: 100, value: 7 });
    expect(last().snapshot.memory[100]).toBe(7);
    loop.handleCommand({ type: 'run', speed: 1 });
    clock.advance(0);
    loop.handleCommand({ type: 'poke', address: 100, value: 9 });
    expect(last().snapshot.memory[100]).toBe(7);
  });

  it('a program with errors loads as empty and refuses to run', () => {
    const { loop, last } = setup('FOO');
    expect(last().state).toBe('empty');
    loop.handleCommand({ type: 'run', speed: 4 });
    expect(last().state).toBe('empty');
  });
});
