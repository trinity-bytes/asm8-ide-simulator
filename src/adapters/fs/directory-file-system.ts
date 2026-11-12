import {
  basename,
  dirname,
  FileSystemError,
  sortEntries,
  type FileContent,
  type FileEntry,
  type FileSystemPort,
  type WorkspaceKind,
} from '@app/workspace/file-system';

/** Files that are never shown: VCS folders, OS junk, dependency folders. */
const HIDDEN = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db', '.crswap']);
const MAX_ENTRIES = 5000;

function wrap(e: unknown, path: string): never {
  const name = (e as { name?: string }).name;
  if (name === 'NotFoundError') throw new FileSystemError(`Not found: ${path}`, 'not-found');
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    throw new FileSystemError('Asm8 no longer has access to this folder.', 'permission');
  }
  if (name === 'InvalidModificationError')
    throw new FileSystemError(`"${basename(path)}" already exists`, 'exists');
  if (e instanceof FileSystemError) throw e;
  throw new FileSystemError(e instanceof Error ? e.message : String(e), 'unknown');
}

/**
 * FileSystemPort over a FileSystemDirectoryHandle. The same code serves a real folder picked with
 * `showDirectoryPicker()` and the browser workspace from `navigator.storage.getDirectory()` (OPFS),
 * because both expose the same handle API.
 */
export class DirectoryFileSystem implements FileSystemPort {
  constructor(
    readonly root: FileSystemDirectoryHandle,
    readonly kind: WorkspaceKind,
    readonly name: string = root.name,
  ) {}

  private async dir(path: string, create = false): Promise<FileSystemDirectoryHandle> {
    let handle = this.root;
    for (const part of path.split('/').filter(Boolean)) {
      handle = await handle.getDirectoryHandle(part, { create });
    }
    return handle;
  }

  private async file(path: string, create = false): Promise<FileSystemFileHandle> {
    const parent = await this.dir(dirname(path), create);
    return parent.getFileHandle(basename(path), { create });
  }

  async list(): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const walk = async (
      handle: FileSystemDirectoryHandle,
      prefix: string,
      depth: number,
    ): Promise<number> => {
      let count = 0;
      for await (const [name, child] of handle as unknown as AsyncIterable<[string, FileSystemHandle]>) {
        if (HIDDEN.has(name) || entries.length >= MAX_ENTRIES) continue;
        count++;
        const path = prefix ? `${prefix}/${name}` : name;
        if (child.kind === 'directory') {
          const at = entries.length;
          entries.push({ path, name, kind: 'directory', size: 0, depth });
          const size = await walk(child as FileSystemDirectoryHandle, path, depth + 1);
          entries[at] = { ...entries[at]!, size };
        } else {
          const file = await (child as FileSystemFileHandle).getFile();
          entries.push({ path, name, kind: 'file', size: file.size, depth });
        }
      }
      return count;
    };
    try {
      await walk(this.root, '', 0);
    } catch (e) {
      wrap(e, '');
    }
    return sortEntries(entries);
  }

  async read(path: string): Promise<FileContent> {
    try {
      const file = await (await this.file(path)).getFile();
      return { text: await file.text(), lastModified: file.lastModified };
    } catch (e) {
      wrap(e, path);
    }
  }

  async write(path: string, text: string): Promise<number> {
    try {
      const handle = await this.file(path, true);
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return (await handle.getFile()).lastModified;
    } catch (e) {
      wrap(e, path);
    }
  }

  async createDirectory(path: string): Promise<void> {
    try {
      const parent = await this.dir(dirname(path));
      const exists = await parent.getDirectoryHandle(basename(path)).then(
        () => true,
        () => false,
      );
      if (exists) throw new FileSystemError(`"${basename(path)}" already exists`, 'exists');
      await parent.getDirectoryHandle(basename(path), { create: true });
    } catch (e) {
      wrap(e, path);
    }
  }

  private async exists(path: string): Promise<boolean> {
    try {
      const parent = await this.dir(dirname(path));
      for await (const name of (parent as unknown as { keys(): AsyncIterable<string> }).keys()) {
        if (name === basename(path)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Byte-exact copy (works for any file type, not only text). */
  private async copyFile(from: string, to: string): Promise<void> {
    const blob = await (await this.file(from)).getFile();
    const writable = await (await this.file(to, true)).createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /**
   * Uses the native `move()` when the browser has it; otherwise copies byte for byte and only then
   * deletes the original, so a failure part-way leaves a duplicate, never a loss.
   */
  async rename(from: string, to: string): Promise<void> {
    try {
      if (await this.exists(to)) throw new FileSystemError(`"${basename(to)}" already exists`, 'exists');
      const parent = await this.dir(dirname(from));
      const handle: FileSystemHandle = await parent
        .getDirectoryHandle(basename(from))
        .catch(() => parent.getFileHandle(basename(from)));

      const movable = handle as FileSystemHandle & {
        move?: (dest: FileSystemDirectoryHandle, name: string) => Promise<void>;
      };
      if (typeof movable.move === 'function') {
        await movable.move(await this.dir(dirname(to), true), basename(to));
        return;
      }

      if (handle.kind === 'file') {
        await this.copyFile(from, to);
      } else {
        const all = (await this.list()).filter((e) => e.path.startsWith(from + '/'));
        await this.dir(to, true);
        for (const e of all) {
          const target = to + e.path.slice(from.length);
          if (e.kind === 'directory') await this.dir(target, true);
          else await this.copyFile(e.path, target);
        }
      }
      await parent.removeEntry(basename(from), { recursive: true });
    } catch (e) {
      wrap(e, from);
    }
  }

  async remove(path: string): Promise<void> {
    try {
      const parent = await this.dir(dirname(path));
      await parent.removeEntry(basename(path), { recursive: true });
    } catch (e) {
      wrap(e, path);
    }
  }

  async stat(path: string): Promise<number | null> {
    try {
      return (await (await this.file(path)).getFile()).lastModified;
    } catch {
      return null;
    }
  }
}
