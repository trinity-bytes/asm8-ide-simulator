import { describe, expect, it } from 'vitest';
import { assemble } from '../assembler/assembler';
import { Machine } from '../machine/machine';
import { compileCondition } from './condition';
import { Debugger } from './debugger';

const setup = (src: string) => {
  const m = new Machine();
  m.load(assemble(src));
  return { m, dbg: new Debugger(m) };
};

const LOOP = `MOV A, 0
loop: INC A
CMP A, 5
JNZ loop
HLT`;

const CALLS = `CALL sub
MOV B, 1
HLT
sub: MOV A, 1
CALL leaf
RET
leaf: MOV C, 1
RET`;

describe('Debugger', () => {
  it('continues until a breakpoint and does not stop again on the same line when resumed', () => {
    const { m, dbg } = setup(LOOP);
    dbg.setBreakpoints([{ line: 2 }]);
    expect(dbg.continue(1000)).toEqual({ kind: 'breakpoint', line: 2 });
    expect(m.cpu.gpr[0]).toBe(1);
    expect(dbg.continue(1000)).toEqual({ kind: 'breakpoint', line: 2 });
    expect(m.cpu.gpr[0]).toBe(2);
  });

  it('honours a condition', () => {
    const { m, dbg } = setup(LOOP);
    dbg.setBreakpoints([{ line: 2, condition: 'A == 3' }]);
    expect(dbg.continue(1000)).toEqual({ kind: 'breakpoint', line: 2 });
    expect(m.cpu.gpr[0]).toBe(3);
  });

  it('honours a hit count', () => {
    const { m, dbg } = setup(LOOP);
    dbg.setBreakpoints([{ line: 1, hitCount: 4 }]);
    dbg.continue(1000);
    expect(m.cpu.gpr[0]).toBe(3);
  });

  it('skips disabled breakpoints and reports a bad condition', () => {
    const { dbg } = setup(LOOP);
    dbg.setBreakpoints([{ line: 1, enabled: false }]);
    expect(dbg.continue(1000)).toEqual({ kind: 'halted' });
    const second = setup(LOOP);
    second.dbg.setBreakpoints([{ line: 2, condition: 'A ==' }]);
    expect(second.dbg.continue(1000)).toMatchObject({ kind: 'condition-error', line: 2 });
  });

  it('returns budget when the slice ends and resumes the same goal', () => {
    const { m, dbg } = setup(LOOP);
    expect(dbg.continue(3)).toEqual({ kind: 'budget' });
    expect(dbg.busy).toBe(true);
    expect(dbg.resume(1000)).toEqual({ kind: 'halted' });
    expect(m.cpu.gpr[0]).toBe(5);
  });

  it('steps over a CALL, running the whole routine', () => {
    const { m, dbg } = setup(CALLS);
    expect(dbg.stepOver(1000)).toEqual({ kind: 'step' });
    expect(m.lineAt(m.cpu.ip)).toBe(1);
    expect(m.cpu.gpr.slice(0, 3)).toEqual([1, 0, 1]);
  });

  it('steps out of the current routine', () => {
    const { m, dbg } = setup(CALLS);
    dbg.step(); // into sub
    dbg.step(); // MOV A, 1
    dbg.step(); // into leaf
    expect(m.lineAt(m.cpu.ip)).toBe(6);
    expect(dbg.stepOut(1000)).toEqual({ kind: 'step' });
    expect(m.lineAt(m.cpu.ip)).toBe(5);
  });

  it('step over a plain instruction is a single step', () => {
    const { m, dbg } = setup(LOOP);
    expect(dbg.stepOver(1000)).toEqual({ kind: 'step' });
    expect(m.cpu.ip).toBe(3);
  });

  it('keeps the goal while waiting for input and resumes after typing', () => {
    const { m, dbg } = setup('IN A\nIN B\nHLT');
    expect(dbg.continue(100)).toEqual({ kind: 'waiting' });
    m.pushInput([1]);
    expect(dbg.resumeAfterInput(100)).toEqual({ kind: 'waiting' });
    m.pushInput([2]);
    expect(dbg.resumeAfterInput(100)).toEqual({ kind: 'halted' });
  });
});

describe('compileCondition', () => {
  const ctx = {
    register: (n: string) => ({ A: 0x41, B: 2, C: 3, D: 0, SP: 0xe7, IP: 9 })[n]!,
    flag: (n: string) => n === 'Z',
    memory: (addr: number) => (addr === 0xe8 ? 72 : 0),
  };
  it.each([
    ['A == 0x41', 1],
    ["A == 'A'", 1],
    ['B + C * 2 == 8', 1],
    ['(B + C) * 2', 10],
    ['C > 5 && Z', 0],
    ['C > 5 || Z', 1],
    ['!CF', 1],
    ['[0xE8] == 72', 1],
    ['[SP + 1] == 72', 1],
    ['1100b == 12 && 0o14 == 12', 1],
    ['SP >= 0xE0', 1],
  ])('%s → %d', (src, expected) => {
    expect(compileCondition(src)(ctx as never)).toBe(expected);
  });

  it.each(['', 'A ==', 'FOO', 'A @ 1', '[A'])('rejects %j', (src) => {
    expect(() => compileCondition(src)).toThrow();
  });
});
