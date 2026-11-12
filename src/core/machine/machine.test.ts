import { describe, expect, it } from 'vitest';
import { assemble } from '../assembler/assembler';
import { Machine } from './machine';

const load = (src: string) => {
  const m = new Machine();
  const a = assemble(src);
  expect(a.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  m.load(a);
  return m;
};
const runAll = (m: Machine) => {
  let r;
  for (let i = 0; i < 1000; i++) {
    r = m.step();
    if (r.kind !== 'ok') return r;
  }
  return r;
};

describe('Machine', () => {
  it('OUT sends a register to the console output', () => {
    const m = load("MOV A, 'H'\nOUT A\nMOV A, 'i'\nOUT A\nHLT");
    expect(runAll(m)).toEqual({ kind: 'halted' });
    expect(String.fromCharCode(...m.takeOutput())).toBe('Hi');
    expect(m.takeOutput()).toEqual([]);
  });

  it('IN waits for input without advancing, then reads one byte per instruction', () => {
    const m = load('IN A\nIN B\nHLT');
    expect(m.step()).toEqual({ kind: 'waiting' });
    expect(m.status).toBe('waiting');
    expect(m.cpu.ip).toBe(0);
    m.pushInput([65, 66]);
    expect(runAll(m)).toEqual({ kind: 'halted' });
    expect(m.cpu.gpr.slice(0, 2)).toEqual([65, 66]);
    expect(m.steps).toBe(3);
  });

  it('fixes the legacy SUB reg, SP bug (it subtracted undefined)', () => {
    const m = load('MOV A, 240\nSUB A, SP\nHLT');
    runAll(m);
    expect(m.cpu.gpr[0]).toBe(240 - 231);
  });

  it('wraps NOT 0xFF to 0 (legacy produced 256)', () => {
    const m = load('MOV A, 255\nNOT A\nHLT');
    runAll(m);
    expect(m.cpu.gpr[0]).toBe(0);
    expect(m.cpu.carry).toBe(true);
  });

  it('logs memory writes with step, old and new value and source line', () => {
    const m = load('MOV [200], 7\nMOV [200], 9\nHLT');
    runAll(m);
    expect(m.writes).toEqual([
      { step: 1, address: 200, previous: 0, value: 7, line: 0 },
      { step: 2, address: 200, previous: 7, value: 9, line: 1 },
    ]);
  });

  it('stops on a fault, keeps the message and refuses to run until reset', () => {
    const m = load('DIV 0');
    expect(m.step()).toEqual({ kind: 'fault', message: 'Division by 0' });
    // IP moved past the opcode (legacy behaviour) but the snapshot points at the faulting line.
    expect(m.cpu.ip).toBe(1);
    expect(m.snapshot()).toMatchObject({ line: 0, faultAddress: 0 });
    expect(m.step()).toEqual({ kind: 'fault', message: 'Division by 0' });
    m.reset();
    expect(m.status).toBe('ready');
    expect(m.snapshot().fault).toBeUndefined();
  });

  it('reset restores the loaded program and clears output and writes', () => {
    const m = load("MOV [0], 0\nMOV A, 'x'\nOUT A\nHLT");
    runAll(m);
    m.reset();
    expect(m.memory.data[0]).toBe(7);
    expect(m.takeOutput()).toEqual([]);
    expect(m.writes).toEqual([]);
    expect(m.steps).toBe(0);
  });

  it('poke edits memory without logging a program write', () => {
    const m = load('HLT');
    m.poke(100, 0x1ff);
    expect(m.memory.data[100]).toBe(0xff);
    expect(m.writes).toEqual([]);
  });

  it('keeps at most 16 KiB of pending console output and counts the rest as dropped', () => {
    const m = load("loop: MOV A, 'z'\nOUT A\nJMP loop");
    for (let i = 0; i < 3 * 70_000; i++) m.step();
    const out = m.takeOutput();
    expect(out.length).toBe(16 * 1024);
    expect(out.length + m.takeDropped()).toBe(70_000);
    expect(m.takeDropped()).toBe(0);
  });
});
