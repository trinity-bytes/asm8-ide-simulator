import { describe, expect, it } from 'vitest';
import { assemble } from '../../src/core/assembler/assembler';
import { ENCODINGS } from '../../src/core/assembler/encodings';
import { Machine } from '../../src/core/machine/machine';
import { HELLO_WORLD, loadLegacy, type Legacy } from '../support/legacy';

/** Mulberry32: tiny deterministic PRNG so failures reproduce. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function legacyAssemble(legacy: Legacy, src: string) {
  try {
    return { ok: true as const, ...legacy.assembler.go(src) };
  } catch (e) {
    const err = e as { error: unknown; line?: number };
    return { ok: false as const, error: String(err.error), line: err.line };
  }
}

/** Runs both machines step by step and compares the full state after every step. */
const shared = loadLegacy();

/** Returns how many steps were compared (-1 when both assemblers rejected the source). */
function compareRun(src: string, maxSteps = 400): number {
  const legacy = shared;
  const expected = legacyAssemble(legacy, src);
  const actual = assemble(src);
  expect(actual.ok, `assembly ok for:\n${src}\n${JSON.stringify(actual.diagnostics)}`).toBe(expected.ok);
  if (!expected.ok) return -1;
  expect(actual.code).toEqual(expected.code);
  expect(Object.fromEntries([...actual.addressToLine].map(([a, l]) => [String(a), l]))).toEqual(
    Object.fromEntries(Object.entries(expected.mapping).map(([a, l]) => [a, l])),
  );
  expect(actual.labels).toEqual(expected.labels);

  legacy.cpu.reset();
  legacy.memory.reset();
  expected.code.forEach((b, i) => (legacy.memory.data[i] = b));
  const machine = new Machine();
  machine.load(actual);

  for (let step = 0; step < maxSteps; step++) {
    let legacyRunning: boolean;
    let legacyFault: string | undefined;
    try {
      legacyRunning = legacy.cpu.step();
    } catch (e) {
      legacyRunning = false;
      legacyFault = String(e);
    }
    const result = machine.step();

    // Known legacy bugs produce values outside a byte; stop comparing once that happens.
    if (legacy.cpu.gpr.some((v) => v > 255) || legacy.memory.data.some((v) => v > 255)) return step;

    const regs = machine.cpu.registers();
    const where = `step ${step}\n${src}`;
    expect(regs.gpr, where).toEqual(legacy.cpu.gpr);
    expect(regs.sp, where).toBe(legacy.cpu.sp);
    expect(regs.ip, where).toBe(legacy.cpu.ip);
    expect(regs.zero, where).toBe(legacy.cpu.zero);
    expect(regs.carry, where).toBe(legacy.cpu.carry);
    const mem = machine.memory.data;
    if (mem.some((v, i) => v !== legacy.memory.data[i])) {
      expect(Array.from(mem), where).toEqual(legacy.memory.data);
    }
    expect(machine.memory.lastAccess, where).toBe(legacy.memory.lastAccess);

    if (legacyFault !== undefined) {
      expect(result, where).toEqual({ kind: 'fault', message: legacyFault });
      return step + 1;
    }
    if (!legacyRunning) {
      expect(result.kind, where).toBe('halted');
      return step + 1;
    }
    expect(result.kind, where).toBe('ok');
  }
  return maxSteps;
}

describe('parity with the legacy simulator', () => {
  it('assembles and runs the hello world example identically, halting after 83 steps', () => {
    compareRun(HELLO_WORLD);
    const machine = new Machine();
    machine.load(assemble(HELLO_WORLD));
    let result;
    do result = machine.step();
    while (result.kind === 'ok');
    expect(result.kind).toBe('halted');
    expect(machine.steps).toBe(83);
    const display = String.fromCharCode(...machine.memory.data.slice(232, 244));
    expect(display).toBe('Hello World!');
  });

  const REGS = ['A', 'B', 'C', 'D'];
  const operandFor = (kind: string, rand: () => number, allowSP: boolean): string => {
    const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
    switch (kind) {
      case 'register':
        return allowSP && rand() < 0.1 ? 'SP' : pick(REGS);
      case 'regaddress': {
        const reg = pick([...REGS, 'SP']);
        if (rand() < 0.5) return `[${reg}]`;
        const off = Math.floor(rand() * 32) - 16;
        return `[${reg}${off < 0 ? off : `+${off}`}]`;
      }
      case 'address':
        return `[${Math.floor(rand() * 256)}]`;
      case 'number':
        return rand() < 0.15 ? 'L' + Math.floor(rand() * 4) : String(Math.floor(rand() * 256));
      default:
        throw new Error(kind);
    }
  };

  it('runs 400 random programs with identical state after every step', () => {
    const rand = rng(0xa5a8);
    let assembled = 0;
    let steps = 0;
    const names = Object.keys(ENCODINGS).filter((n) => n !== 'IN' && n !== 'OUT');
    for (let p = 0; p < 400; p++) {
      const lines: string[] = [];
      const count = 3 + Math.floor(rand() * 14);
      for (let i = 0; i < count; i++) {
        const name = names[Math.floor(rand() * names.length)]!;
        const enc = ENCODINGS[name]!;
        const forms = Object.keys(enc.forms);
        const form = forms[Math.floor(rand() * forms.length)]!;
        const kinds = form === '' ? [] : form.split(',');
        // Legacy SUB reg,reg read SP wrongly (intentional fix), so SP is never a SUB source.
        const ops = kinds.map((k, idx) => operandFor(k, rand, !(name === 'SUB' && idx === 1)));
        const label = i < 4 ? `L${i}: ` : '';
        lines.push(`${label}${name}${ops.length ? ' ' + ops.join(', ') : ''}`);
      }
      // Make sure every referenced label exists.
      for (let i = count; i < 4; i++) lines.push(`L${i}: HLT`);
      lines.push('HLT');
      const compared = compareRun(lines.join('\n'));
      if (compared >= 0) {
        assembled++;
        steps += compared;
      }
    }
    // Guard against a generator that only produces rejected or trivial programs.
    expect(assembled).toBeGreaterThan(300);
    expect(steps).toBeGreaterThan(1500);
  }, 60_000);

  it.each([
    ['MOV A, 256', 'number must have a value between 0-255'],
    ['MOV A, [300]', 'address must have a value between 0-255'],
    ['MOV [A+20], 1', 'offset must be a value between -16...+15'],
    ['FOO A', 'Invalid instruction: FOO'],
    ['   ???', 'Syntax error'],
    ['HLT A', 'HLT: too many arguments'],
    ['INC A, B', 'INC: too many arguments'],
    ['INC 3', 'INC does not support this operand'],
    ['MOV 3, A', 'MOV does not support this operands'],
    ["DB 'ab'", 'Only one character is allowed. Use String instead'],
    ['A: HLT', 'Label contains keyword: A'],
    ['MOV A, 0xZZ', 'Not a number: NaN'],
    ['MOV A, 12q', 'Invalid number format'],
    ['JMP nowhere', 'Undefined label: nowhere'],
  ])('reports %s with the legacy message', (src, message) => {
    const legacy = legacyAssemble(loadLegacy(), src);
    expect(legacy.ok).toBe(false);
    if (!legacy.ok) expect(legacy.error).toBe(message);
    const errors = assemble(src).diagnostics.filter((d) => d.severity === 'error');
    expect(errors[0]?.message).toBe(message);
  });
});
