import { describe, expect, it } from 'vitest';
import { assemble } from '../assembler/assembler';
import { MNEMONICS } from '../assembler/encodings';
import { Machine } from '../machine/machine';
import { findInstruction, INSTRUCTIONS } from './catalog';

/** Assembles `src` (no errors allowed), runs it until it stops and returns the machine and outcome. */
const run = (src: string) => {
  const assembly = assemble(src);
  expect(assembly.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const m = new Machine();
  m.load(assembly);
  let result = m.step();
  for (let i = 0; i < 1000 && result.kind === 'ok'; i++) result = m.step();
  return { m, result };
};

describe('instruction catalog', () => {
  it('documents every mnemonic and alias the assembler accepts', () => {
    for (const m of MNEMONICS) expect(findInstruction(m), m).toBeDefined();
  });

  it('lists MOV forms with real opcodes and sizes', () => {
    const mov = findInstruction('mov')!;
    expect(mov.forms).toContainEqual({ operands: 'reg, value', opcode: 6, bytes: 3 });
    expect(mov.forms).toHaveLength(8);
  });

  it('marks IN and OUT as new', () => {
    expect(INSTRUCTIONS.filter((i) => i.isNew).map((i) => i.mnemonic)).toEqual(['IN', 'OUT']);
  });

  it('gives every instruction at least two examples and at least one note', () => {
    for (const doc of INSTRUCTIONS) {
      expect(doc.examples.length, doc.mnemonic).toBeGreaterThanOrEqual(2);
      expect(doc.notes.length, doc.mnemonic).toBeGreaterThanOrEqual(1);
      for (const ex of doc.examples) expect(ex.note.trim(), doc.mnemonic).not.toBe('');
    }
  });

  it('has examples that assemble cleanly and use the instruction they document', () => {
    for (const doc of INSTRUCTIONS) {
      const names = [doc.mnemonic, ...doc.aliases];
      const used = new RegExp(`^\\s*(?:[.\\w]+:)?\\s*(${names.join('|')})\\b`, 'im');
      for (const ex of doc.examples) {
        expect(assemble(ex.code).diagnostics, `${doc.mnemonic}: ${ex.code}`).toEqual([]);
        expect(ex.code, doc.mnemonic).toMatch(used);
      }
    }
  });
});

describe('documented edge cases are real', () => {
  it('ADD past 255 wraps to 0 and sets C but not Z', () => {
    const { m } = run('MOV A, 255\nADD A, 1\nHLT');
    expect([m.cpu.gpr[0], m.cpu.carry, m.cpu.zero]).toEqual([0, true, false]);
  });

  it('SUB below 0 wraps and sets C', () => {
    const { m } = run('MOV A, 3\nSUB A, 5\nHLT');
    expect([m.cpu.gpr[0], m.cpu.carry]).toEqual([254, true]);
  });

  it('DEC to 0 sets Z; DEC 0 wraps to 255 with C', () => {
    expect(run('MOV C, 1\nDEC C\nHLT').m.cpu.zero).toBe(true);
    const { m } = run('MOV A, 0\nDEC A\nHLT');
    expect([m.cpu.gpr[0], m.cpu.carry]).toEqual([255, true]);
  });

  it('MUL 16 × 16 leaves 0 with C set and Z clear', () => {
    const { m } = run('MOV A, 16\nMUL 16\nHLT');
    expect([m.cpu.gpr[0], m.cpu.carry, m.cpu.zero]).toEqual([0, true, false]);
  });

  it('DIV rounds down and dividing by 0 is a fault', () => {
    expect(run('MOV A, 17\nDIV 5\nHLT').m.cpu.gpr[0]).toBe(3);
    expect(run('MOV A, 1\nDIV 0\nHLT').result).toEqual({ kind: 'fault', message: 'Division by 0' });
  });

  it('NOT always sets C and never Z', () => {
    const { m } = run('MOV A, 0xFF\nNOT A\nHLT');
    expect([m.cpu.gpr[0], m.cpu.carry, m.cpu.zero]).toEqual([0, true, false]);
    expect(run('MOV A, 0x0F\nNOT A\nHLT').m.cpu.gpr[0]).toBe(0xf0);
  });

  it('SHL drops bit 7 into C; SHR never sets C', () => {
    const a = run('MOV A, 0x81\nSHL A, 1\nHLT').m;
    expect([a.cpu.gpr[0], a.cpu.carry]).toEqual([2, true]);
    const b = run('MOV A, 0x80\nSHL A, 1\nHLT').m;
    expect([b.cpu.gpr[0], b.cpu.carry, b.cpu.zero]).toEqual([0, true, false]);
    const c = run('MOV A, 1\nSHR A, 1\nHLT').m;
    expect([c.cpu.gpr[0], c.cpu.carry, c.cpu.zero]).toEqual([0, false, true]);
  });

  it('OR turns a digit into its character', () => {
    expect(run('MOV A, 5\nOR A, 0x30\nHLT').m.cpu.gpr[0]).toBe(0x35);
  });

  it('stack faults: POP on an empty stack, PUSH below 0, SP above 0xE7', () => {
    expect(run('POP A\nHLT').result).toEqual({ kind: 'fault', message: 'Stack underflow' });
    expect(run('MOV SP, 0\nPUSH 1\nHLT').result).toEqual({ kind: 'fault', message: 'Stack overflow' });
    expect(run('MOV SP, 240\nHLT').result).toEqual({ kind: 'fault', message: 'Stack underflow' });
    expect(run('RET').result).toEqual({ kind: 'fault', message: 'Stack underflow' });
  });

  it('PUSH/POP swaps registers and CALL/RET restores SP', () => {
    const { m } = run('MOV A, 1\nMOV B, 2\nPUSH A\nPUSH B\nPOP A\nPOP B\nCALL r\nHLT\nr: RET');
    expect([m.cpu.gpr[0], m.cpu.gpr[1], m.cpu.sp]).toEqual([2, 1, 0xe7]);
  });

  it('MOV [reg+n] reads at register + offset and the offset is limited to -16…+15', () => {
    const { m } = run('MOV [0x82], 9\nMOV B, 0x80\nMOV A, [B+2]\nHLT');
    expect(m.cpu.gpr[0]).toBe(9);
    expect(assemble('MOV A, [B+16]').ok).toBe(false);
  });

  it('DB 0x0A stores the newline code and a dot label is not scoped', () => {
    expect(assemble('DB 0x0A').code).toEqual([10]);
    expect(assemble('.x: HLT\n.x: HLT').ok).toBe(false);
  });

  it('memory-to-memory MOV is rejected', () => {
    expect(assemble('MOV [1], [2]').ok).toBe(false);
  });
});
