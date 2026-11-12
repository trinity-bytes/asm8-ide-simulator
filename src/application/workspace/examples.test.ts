import { describe, expect, it } from 'vitest';
import { assemble, Machine } from '@core/index';
import { EXAMPLES } from './examples';

describe('examples', () => {
  it.each(EXAMPLES.map((e) => [e.file, e.source]))('%s assembles without problems', (_, source) => {
    expect(assemble(source).diagnostics).toEqual([]);
  });

  const run = (source: string, input: number[] = []) => {
    const m = new Machine();
    m.load(assemble(source));
    m.pushInput(input);
    let r;
    for (let i = 0; i < 20_000; i++) if ((r = m.step()).kind !== 'ok') break;
    return { m, r };
  };

  it('fibonacci stores 1 1 2 3 5 … 233 and halts', () => {
    const { m, r } = run(EXAMPLES[1]!.source);
    expect(r?.kind).toBe('halted');
    expect(Array.from(m.memory.data.slice(0x80, 0x8d))).toEqual([
      1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233,
    ]);
  });

  it('bubble sort sorts its 8 bytes', () => {
    const { m, r } = run(EXAMPLES[2]!.source);
    expect(r?.kind).toBe('halted');
    expect(Array.from(m.memory.data.slice(2, 10))).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
  });

  it('keyboard echo prints what was typed until Enter', () => {
    const { m, r } = run(EXAMPLES[3]!.source, [...'hi'].map((c) => c.charCodeAt(0)).concat(10));
    expect(r?.kind).toBe('halted');
    expect(String.fromCharCode(...m.takeOutput())).toBe('hi');
  });
});
