import type { FileSystemPort } from '@app/workspace/file-system';
import { EXAMPLES } from '@app/workspace/examples';
import type {
  PickedFile,
  RecentFolder,
  RestoredWorkspace,
  WorkspaceProvider,
} from '@app/workspace/workspace-provider';
import { idbGet, idbSet } from '../storage/idb';
import { DirectoryFileSystem } from './directory-file-system';
import { MemoryFileSystem } from './memory-file-system';

type PermissionHandle = FileSystemDirectoryHandle & {
  queryPermission?(d: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(d: { mode: 'readwrite' }): Promise<PermissionState>;
};

type PickerWindow = Window & {
  showDirectoryPicker?(o?: { mode?: 'readwrite'; id?: string }): Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker?(o?: unknown): Promise<FileSystemFileHandle[]>;
};

const RECENTS = 'recents';
const LAST = 'last';
const MAX_RECENTS = 6;

interface StoredRecent extends RecentFolder {
  readonly handle: FileSystemDirectoryHandle;
}

const isAbort = (e: unknown) => (e as { name?: string }).name === 'AbortError';

/** WorkspaceProvider for browsers: File System Access where available, OPFS everywhere. */
export class BrowserWorkspaceProvider implements WorkspaceProvider {
  private readonly win = window as PickerWindow;
  private examplesFs: MemoryFileSystem | null = null;

  get canOpenFolders(): boolean {
    return typeof this.win.showDirectoryPicker === 'function';
  }

  async openFolder(): Promise<FileSystemPort | null> {
    if (!this.win.showDirectoryPicker) return null;
    try {
      const handle = await this.win.showDirectoryPicker({ mode: 'readwrite', id: 'asm8-folder' });
      const fs = new DirectoryFileSystem(handle, 'folder');
      await this.addRecent(handle);
      return fs;
    } catch (e) {
      if (isAbort(e)) return null;
      throw e;
    }
  }

  async browserWorkspace(): Promise<FileSystemPort> {
    const root = await navigator.storage.getDirectory();
    // Ask the browser not to evict the user's programs under storage pressure (best effort).
    void navigator.storage.persist?.();
    return new DirectoryFileSystem(root, 'browser', 'Browser workspace');
  }

  examples(): FileSystemPort {
    this.examplesFs ??= new MemoryFileSystem(
      'examples',
      'Examples',
      Object.fromEntries(EXAMPLES.map((e) => [e.file, e.source])),
    );
    return this.examplesFs;
  }

  private async recents(): Promise<StoredRecent[]> {
    try {
      return (await idbGet<StoredRecent[]>(RECENTS)) ?? [];
    } catch {
      return [];
    }
  }

  private async addRecent(handle: FileSystemDirectoryHandle): Promise<void> {
    const list = await this.recents();
    const same = await Promise.all(list.map((r) => r.handle.isSameEntry(handle).catch(() => false)));
    const kept = list.filter((_, i) => !same[i]);
    const id = crypto.randomUUID();
    await idbSet(
      RECENTS,
      [{ id, name: handle.name, openedAt: Date.now(), handle }, ...kept].slice(0, MAX_RECENTS),
    );
    await idbSet(LAST, { kind: 'folder', id });
  }

  async recent(): Promise<RecentFolder[]> {
    return (await this.recents()).map(({ id, name, openedAt }) => ({ id, name, openedAt }));
  }

  async forgetRecent(id: string): Promise<void> {
    await idbSet(
      RECENTS,
      (await this.recents()).filter((r) => r.id !== id),
    );
  }

  async openRecent(id: string): Promise<RestoredWorkspace | null> {
    const entry = (await this.recents()).find((r) => r.id === id);
    if (!entry) return null;
    const handle = entry.handle as PermissionHandle;
    const state = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted';
    await idbSet(LAST, { kind: 'folder', id });
    return { fs: new DirectoryFileSystem(handle, 'folder'), granted: state === 'granted' };
  }

  async restoreLast(): Promise<RestoredWorkspace | null> {
    let last: { kind: string; id?: string } | undefined;
    try {
      last = await idbGet(LAST);
    } catch {
      return null;
    }
    if (!last) return null;
    if (last.kind === 'browser') return { fs: await this.browserWorkspace(), granted: true };
    if (last.kind === 'examples') return { fs: this.examples(), granted: true };
    if (last.kind === 'folder' && last.id) return this.openRecent(last.id);
    return null;
  }

  async requestAccess(fs: FileSystemPort): Promise<boolean> {
    if (!(fs instanceof DirectoryFileSystem)) return true;
    const handle = fs.root as PermissionHandle;
    if (!handle.requestPermission) return true;
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  }

  async rememberCurrent(fs: FileSystemPort): Promise<void> {
    try {
      if (fs.kind === 'folder' && fs instanceof DirectoryFileSystem) {
        const match = (await this.recents()).find((r) => r.name === fs.name);
        if (match) await idbSet(LAST, { kind: 'folder', id: match.id });
      } else {
        await idbSet(LAST, { kind: fs.kind });
      }
    } catch {
      // Remembering is a convenience; ignore storage failures.
    }
  }

  async pickFiles(): Promise<PickedFile[]> {
    if (this.win.showOpenFilePicker) {
      try {
        const handles = await this.win.showOpenFilePicker({
          multiple: true,
          types: [{ description: 'Assembly', accept: { 'text/plain': ['.asm', '.s', '.txt'] } }],
        });
        return Promise.all(
          handles.map(async (h) => ({ name: h.name, text: await (await h.getFile()).text() })),
        );
      } catch (e) {
        if (isAbort(e)) return [];
        throw e;
      }
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.asm,.s,.txt,text/plain';
      input.onchange = async () => {
        const files = [...(input.files ?? [])];
        resolve(await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() }))));
      };
      input.addEventListener('cancel', () => resolve([]));
      input.click();
    });
  }

  download(name: string, text: string): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
