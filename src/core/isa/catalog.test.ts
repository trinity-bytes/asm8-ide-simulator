import { describe, expect, it } from 'vitest';
import { MNEMONICS } from '../assembler/encodings';
import { findInstruction, INSTRUCTIONS } from './catalog';

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
});
