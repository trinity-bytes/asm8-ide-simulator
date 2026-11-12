import { describe, expect, it } from 'vitest';
import { assemble } from '../assembler/assembler';
import { Machine } from '../machine/machine';
import { callStack, describeStack } from './stack';

describe('describeStack / callStack', () => {
  it('names who pushed each byte and finds the return address of CALL', () => {
    const a = assemble('MOV A, 9\nCALL sub\nHLT\nsub: PUSH A\nHLT');
    const m = new Machine();
    m.load(a);
    for (let i = 0; i < 3; i++) m.step();
    const entries = describeStack(m.memory.data, m.cpu.sp, a, m.writes);
    expect(entries).toEqual([
      { address: 230, value: 9, pushedBy: 3, returnTo: undefined },
      { address: 231, value: 5, pushedBy: 1, returnTo: 5 },
    ]);
    expect(callStack(entries, a)).toEqual([{ callLine: 1, returnLine: 2, returnAddress: 5 }]);
  });
});
