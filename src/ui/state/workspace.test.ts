import { describe, expect, it, vi } from 'vitest';
import { MemoryFileSystem } from '@adapters/fs/memory-file-system';
import type { WorkspaceProvider } from '@app/workspace/workspace-provider';
import { WorkspaceState } from './workspace.svelte';

const provider = (fs: MemoryFileSystem): WorkspaceProvider => ({
  canOpenFolders: true,
  openFolder: async () => fs,
  browserWorkspace: async () => fs,
  examples: () => fs,
  restoreLast: async () => null,
  openRecent: async () => null,
  recent: async () => [],
  forgetRecent: async () => {},
  requestAccess: async () => true,
  rememberCurrent: async () => {},
  pickFiles: async () => [{ name: 'a.asm', text: 'HLT' }],
  download: vi.fn(),
});

const setup = async (files: Record<string, string>) => {
  const fs = new MemoryFileSystem('folder', 'lab', files);
  const ws = new WorkspaceState(provider(fs));
  await ws.use(fs);
  return { fs, ws };
};

describe('WorkspaceState', () => {
  it('opens the first .asm file and tracks unsaved changes until saved', async () => {
    const { fs, ws } = await setup({ 'b.asm': 'HLT', 'a.asm': 'MOV A, 1' });
    expect(ws.activeFile?.key).toBe('a.asm');
    ws.updateText(ws.activeId!, 'MOV A, 2');
    expect(ws.dirtyTabs).toHaveLength(1);
    expect(ws.close(ws.activeId!)).toBe('needs-confirm');
    await ws.save();
    expect(ws.dirtyTabs).toHaveLength(0);
    expect((await fs.read('a.asm')).text).toBe('MOV A, 2');
  });

  it('renames a file and its open tab follows', async () => {
    const { ws } = await setup({ 'a.asm': 'HLT' });
    expect(await ws.rename('a.asm', 'main.asm')).toBeNull();
    expect(ws.activeFile?.key).toBe('main.asm');
    expect(ws.activeFile?.title).toBe('main.asm');
    expect(await ws.rename('main.asm', 'x/y')).toBe('Names cannot contain \\ / : * ? " < > |');
  });

  it('delete closes open tabs under the deleted folder', async () => {
    const { ws } = await setup({ 'lab/a.asm': 'HLT', 'b.asm': 'HLT' });
    await ws.openFile('b.asm');
    expect(ws.tabs.map((t) => t.key)).toEqual(['lab/a.asm', 'b.asm']);
    expect(await ws.remove('lab')).toBe(true);
    expect(ws.tabs.map((t) => t.key)).toEqual(['b.asm']);
  });

  it('reloads a clean file changed on disk, but flags a dirty one', async () => {
    const { fs, ws } = await setup({ 'a.asm': 'HLT', 'b.asm': 'HLT' });
    const b = await ws.openFile('b.asm');
    ws.updateText(b!.id, 'local edit');
    fs.touch('a.asm', 'MOV A, 1\nHLT');
    fs.touch('b.asm', 'disk edit');
    await ws.checkDisk();
    expect(ws.tabs.find((t) => t.key === 'a.asm')?.text).toBe('MOV A, 1\nHLT');
    expect(ws.tabs.find((t) => t.key === 'b.asm')).toMatchObject({ text: 'local edit', changedOnDisk: true });
  });

  it('creates numbered untitled files and duplicates', async () => {
    const { ws } = await setup({ 'untitled.asm': '' });
    expect(await ws.newFile()).toBe('untitled-2.asm');
    expect(await ws.duplicate('untitled.asm')).toBe('untitled-copy.asm');
  });

  it('collapsing a folder hides its children', async () => {
    const { ws } = await setup({ 'lab/a.asm': 'HLT', 'z.asm': '' });
    expect(ws.visibleEntries.map((e) => e.path)).toEqual(['lab', 'lab/a.asm', 'z.asm']);
    ws.toggleFolder('lab');
    expect(ws.visibleEntries.map((e) => e.path)).toEqual(['lab', 'z.asm']);
  });
});
