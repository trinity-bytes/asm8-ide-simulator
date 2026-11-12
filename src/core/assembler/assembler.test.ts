import { describe, expect, it } from 'vitest';
import { assemble } from './assembler';

describe('assemble', () => {
  it('reports every bad line instead of stopping at the first one', () => {
    const result = assemble('MOV A, 300\nFOO B\nMOV B, 1\nJMP missing');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message])).toEqual([
      [0, 'number must have a value between 0-255'],
      [1, 'Invalid instruction: FOO'],
      [3, 'Undefined label: missing'],
    ]);
  });

  it('offers a quick fix for a misspelled mnemonic, covering only the mnemonic', () => {
    const [d] = assemble('start: MOVV A, 1\nJMP start').diagnostics;
    expect(d).toMatchObject({
      line: 0,
      from: 7,
      to: 11,
      fix: { title: 'Did you mean MOV?', replacement: 'MOV' },
    });
  });

  it('warns about labels that are never used', () => {
    const result = assemble('unused: HLT');
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([
      { line: 0, from: 0, to: 6, severity: 'warning', message: 'Label "unused" is never used' },
    ]);
  });

  it('warns about text after an instruction that the legacy parser ignored', () => {
    const result = assemble('MOV A, 1 junk ; comment');
    expect(result.ok).toBe(true);
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'warning',
      message: 'Unexpected text after instruction: junk',
    });
  });

  it('rejects duplicate labels case-insensitively', () => {
    const errors = assemble('loop: HLT\nLOOP: HLT\nJMP loop').diagnostics.filter(
      (d) => d.severity === 'error',
    );
    expect(errors).toMatchObject([{ line: 1, message: 'Duplicate label: LOOP' }]);
  });

  it('reports a missing operand instead of crashing', () => {
    expect(assemble('MOV A').diagnostics[0]?.message).toBe('MOV: missing operand');
    expect(assemble('INC').diagnostics[0]?.message).toBe('INC: missing operand');
  });

  it('rejects characters that do not fit in a byte', () => {
    expect(assemble('DB "€"').diagnostics[0]?.message).toBe('Character must have a code between 0-255');
  });

  it('reports a program larger than memory once', () => {
    const src = Array.from({ length: 90 }, () => 'MOV A, 1').join('\n');
    const errors = assemble(src).diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe('Binary code does not fit into the memory. Max 256 bytes are allowed');
  });

  it('encodes IN and OUT with opcodes 98 and 99', () => {
    expect(assemble('IN A\nOUT B').code).toEqual([98, 0, 99, 1]);
  });

  it('maps lines to addresses both ways, including DB data lines', () => {
    const result = assemble('JMP start\nmsg: DB "Hi"\nstart: HLT');
    expect([...result.addressToLine]).toEqual([
      [0, 0],
      [4, 2],
    ]);
    expect(result.lineToAddress.get(1)).toBe(2);
    expect(result.labels).toEqual({ msg: 2, start: 4 });
  });

  it('ignores semicolons inside strings when finding the comment', () => {
    const result = assemble('DB ";" ; real comment');
    expect(result.ok).toBe(true);
    expect(result.code).toEqual([59]);
  });
});
