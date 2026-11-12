import { describe, expect, it } from 'vitest';
import { validateName } from '@app/workspace/file-system';
import { MemoryFileSystem } from './memory-file-system';

describe('MemoryFileSystem', () => {
  it('lists folders first, depth first, with sizes', async () => {
    const fs = new MemoryFileSystem('examples', 'x', {
      'b.asm': 'HLT',
      'lab/a.asm': 'NOP',
      'lab/sub/c.asm': '',
    });
    expect((await fs.list()).map((e) => `${e.depth}:${e.path}:${e.size}`)).toEqual([
      '0:lab:2',
      '1:lab/sub:1',
      '2:lab/sub/c.asm:0',
      '1:lab/a.asm:3',
      '0:b.asm:3',
    ]);
  });

  it('renames folders with their content and refuses to overwrite', async () => {
    const fs = new MemoryFileSystem('examples', 'x', { 'lab/a.asm': 'A', 'other.asm': 'O' });
    await fs.rename('lab', 'lab2');
    expect((await fs.read('lab2/a.asm')).text).toBe('A');
    await expect(fs.rename('other.asm', 'lab2')).rejects.toThrow('already exists');
  });

  it('write bumps the modification time; remove deletes recursively', async () => {
    const fs = new MemoryFileSystem('examples', 'x', { 'lab/a.asm': 'A' });
    const before = await fs.stat('lab/a.asm');
    const after = await fs.write('lab/a.asm', 'B');
    expect(after).toBeGreaterThan(before!);
    await fs.remove('lab');
    expect(await fs.list()).toEqual([]);
    expect(await fs.stat('lab/a.asm')).toBeNull();
  });
});

describe('validateName', () => {
  it.each([
    ['', 'A name is required.'],
    ['a/b', 'Names cannot contain \\ / : * ? " < > |'],
    ['Hello.asm', '"Hello.asm" already exists here.'],
    ['ok.asm', null],
  ])('%j → %j', (name, message) => {
    expect(validateName(name, ['hello.asm'])).toBe(message);
  });
});
