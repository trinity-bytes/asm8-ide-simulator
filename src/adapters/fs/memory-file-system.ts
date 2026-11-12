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

/** In-memory workspace: the built-in examples and tests. */
export class MemoryFileSystem implements FileSystemPort {
  private files = new Map<string, { text: string; lastModified: number }>();
  private dirs = new Set<string>();
  private clock = 1;

  constructor(
    readonly kind: WorkspaceKind,
    readonly name: string,
    initial: Readonly<Record<string, string>> = {},
  ) {
    for (const [path, text] of Object.entries(initial)) {
      this.ensureParents(path);
      this.files.set(path, { text, lastModified: this.clock++ });
    }
  }

  private ensureParents(path: string): void {
    for (let dir = dirname(path); dir; dir = dirname(dir)) this.dirs.add(dir);
  }

  private exists(path: string): boolean {
    return this.files.has(path) || this.dirs.has(path);
  }

  async list(): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const depth = (p: string) => p.split('/').length - 1;
    for (const dir of this.dirs) {
      const children = [...this.files.keys(), ...this.dirs].filter((p) => dirname(p) === dir).length;
      entries.push({ path: dir, name: basename(dir), kind: 'directory', size: children, depth: depth(dir) });
    }
    for (const [path, f] of this.files) {
      entries.push({
        path,
        name: basename(path),
        kind: 'file',
        size: new Blob([f.text]).size,
        depth: depth(path),
      });
    }
    return sortEntries(entries);
  }

  async read(path: string): Promise<FileContent> {
    const f = this.files.get(path);
    if (!f) throw new FileSystemError(`File not found: ${path}`, 'not-found');
    return { ...f };
  }

  async write(path: string, text: string): Promise<number> {
    this.ensureParents(path);
    const lastModified = this.clock++;
    this.files.set(path, { text, lastModified });
    return lastModified;
  }

  async createDirectory(path: string): Promise<void> {
    if (this.exists(path)) throw new FileSystemError(`"${basename(path)}" already exists`, 'exists');
    this.ensureParents(path);
    this.dirs.add(path);
  }

  async rename(from: string, to: string): Promise<void> {
    if (!this.exists(from)) throw new FileSystemError(`Not found: ${from}`, 'not-found');
    if (this.exists(to)) throw new FileSystemError(`"${basename(to)}" already exists`, 'exists');
    this.ensureParents(to);
    const move = (p: string) => to + p.slice(from.length);
    for (const [p, f] of [...this.files]) {
      if (p === from || p.startsWith(from + '/')) {
        this.files.delete(p);
        this.files.set(move(p), f);
      }
    }
    for (const d of [...this.dirs]) {
      if (d === from || d.startsWith(from + '/')) {
        this.dirs.delete(d);
        this.dirs.add(move(d));
      }
    }
  }

  async remove(path: string): Promise<void> {
    if (!this.exists(path)) throw new FileSystemError(`Not found: ${path}`, 'not-found');
    for (const p of [...this.files.keys()]) if (p === path || p.startsWith(path + '/')) this.files.delete(p);
    for (const d of [...this.dirs]) if (d === path || d.startsWith(path + '/')) this.dirs.delete(d);
  }

  async stat(path: string): Promise<number | null> {
    return this.files.get(path)?.lastModified ?? null;
  }

  /** Test helper: change a file "outside" Asm8. */
  touch(path: string, text: string): void {
    this.files.set(path, { text, lastModified: this.clock++ });
  }
}
