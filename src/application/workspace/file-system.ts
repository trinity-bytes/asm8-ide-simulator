/** A file or folder inside a workspace. Paths use `/` and never start with one: `lab-01/hello.asm`. */
export interface FileEntry {
  readonly path: string;
  readonly name: string;
  readonly kind: 'file' | 'directory';
  /** Bytes for files, number of direct children for folders. */
  readonly size: number;
  readonly depth: number;
}

export interface FileContent {
  readonly text: string;
  /** Modification time, used to notice changes made outside Asm8. */
  readonly lastModified: number;
}

/**
 * - `folder`: a real folder on disk (File System Access API, Chromium desktop).
 * - `browser`: the private browser workspace (Origin Private File System), every browser.
 * - `examples`: the built-in examples, kept in memory.
 */
export type WorkspaceKind = 'folder' | 'browser' | 'examples';

/** Port: the files Asm8 is working on. */
export interface FileSystemPort {
  readonly kind: WorkspaceKind;
  readonly name: string;
  /** Depth-first list of every entry, folders before files, alphabetical. */
  list(): Promise<FileEntry[]>;
  read(path: string): Promise<FileContent>;
  /** Writes (creating the file if needed) and returns the new modification time. */
  write(path: string, text: string): Promise<number>;
  createDirectory(path: string): Promise<void>;
  /** Moves a file or folder. Fails if the target exists. */
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** Modification time, or null when the file is gone. */
  stat(path: string): Promise<number | null>;
}

export class FileSystemError extends Error {
  constructor(
    message: string,
    readonly code: 'not-found' | 'exists' | 'permission' | 'invalid-name' | 'unknown',
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1);
export const dirname = (path: string): string =>
  path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
export const joinPath = (dir: string, name: string): string => (dir ? `${dir}/${name}` : name);

const INVALID = /[\\/:*?"<>|]/;

/** Returns an error message for a file or folder name, or null when it is fine. */
export function validateName(name: string, siblings: readonly string[] = []): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'A name is required.';
  if (trimmed === '.' || trimmed === '..') return 'This name is reserved.';
  if (INVALID.test(trimmed)) return 'Names cannot contain \\ / : * ? " < > |';
  if (trimmed.length > 120) return 'Names can be at most 120 characters.';
  if (siblings.some((s) => s.toLowerCase() === trimmed.toLowerCase()))
    return `"${trimmed}" already exists here.`;
  return null;
}

/** Sorts entries into explorer order: depth-first, folders first, then by name. */
export function sortEntries(entries: readonly FileEntry[]): FileEntry[] {
  const byParent = new Map<string, FileEntry[]>();
  for (const e of entries) {
    const parent = dirname(e.path);
    byParent.set(parent, [...(byParent.get(parent) ?? []), e]);
  }
  const out: FileEntry[] = [];
  const visit = (dir: string) => {
    const children = (byParent.get(dir) ?? []).sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === 'directory' ? -1 : 1) ||
        a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
    for (const c of children) {
      out.push(c);
      if (c.kind === 'directory') visit(c.path);
    }
  };
  visit('');
  return out;
}
