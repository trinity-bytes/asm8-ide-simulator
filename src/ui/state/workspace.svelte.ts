import {
  basename,
  dirname,
  FileSystemError,
  joinPath,
  validateName,
  type FileEntry,
  type FileSystemPort,
} from '@app/workspace/file-system';
import type { RecentFolder, WorkspaceProvider } from '@app/workspace/workspace-provider';

export type TabKind = 'file' | 'settings' | 'reference';

export interface Tab {
  readonly id: string;
  readonly kind: TabKind;
  /** File path (file tabs) or mnemonic (reference tabs). */
  readonly key: string;
  title: string;
  text: string;
  /** Text as last saved or loaded; `text !== saved` means unsaved changes. */
  saved: string;
  lastModified: number;
  /** Set when the file changed on disk while open. */
  changedOnDisk: boolean;
}

export type CloseResult = 'closed' | 'needs-confirm';

const tabId = (kind: TabKind, key: string) => `${kind}:${key}`;
const SESSION_KEY = 'asm8.tabs.v1';

/** Container: the open workspace, its file tree and the editor tabs. */
export class WorkspaceState {
  fs = $state.raw<FileSystemPort | null>(null);
  /** The folder is known but the browser needs the user to allow access again. */
  needsAccess = $state(false);
  entries = $state.raw<FileEntry[]>([]);
  expanded = $state<Record<string, boolean>>({});
  tabs = $state<Tab[]>([]);
  activeId = $state<string | null>(null);
  recents = $state.raw<RecentFolder[]>([]);
  busy = $state(false);
  /** Path being renamed inline in the explorer. */
  renaming = $state<string | null>(null);
  /** Last error to show in a toast; the UI clears it. */
  error = $state<string | null>(null);

  constructor(readonly provider: WorkspaceProvider) {}

  // ---------- derived ----------

  get active(): Tab | null {
    return this.tabs.find((t) => t.id === this.activeId) ?? null;
  }

  get activeFile(): Tab | null {
    const t = this.active;
    return t?.kind === 'file' ? t : null;
  }

  get dirtyTabs(): Tab[] {
    return this.tabs.filter((t) => t.kind === 'file' && t.text !== t.saved);
  }

  isDirty(tab: Tab): boolean {
    return tab.kind === 'file' && tab.text !== tab.saved;
  }

  /** Entries hidden under a collapsed folder are left out. */
  get visibleEntries(): FileEntry[] {
    const out: FileEntry[] = [];
    let hiddenUnder: string | null = null;
    for (const e of this.entries) {
      if (hiddenUnder && e.path.startsWith(hiddenUnder + '/')) continue;
      hiddenUnder = null;
      out.push(e);
      if (e.kind === 'directory' && !this.expanded[e.path]) hiddenUnder = e.path;
    }
    return out;
  }

  get asmFileCount(): number {
    return this.entries.filter((e) => e.kind === 'file').length;
  }

  // ---------- workspace lifecycle ----------

  private async attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof FileSystemError && e.code === 'permission') this.needsAccess = true;
      this.error = e instanceof Error ? e.message : String(e);
      return undefined;
    }
  }

  async init(): Promise<void> {
    this.recents = await this.provider.recent().catch(() => []);
    const restored = await this.provider.restoreLast().catch(() => null);
    if (!restored) return;
    await this.use(restored.fs, restored.granted);
  }

  async use(fs: FileSystemPort, granted = true): Promise<void> {
    this.fs = fs;
    this.needsAccess = !granted;
    this.entries = [];
    this.expanded = {};
    this.tabs = this.tabs.filter((t) => t.kind !== 'file');
    if (granted) {
      await this.refresh();
      await this.restoreTabs();
    }
    void this.provider.rememberCurrent(fs);
    this.recents = await this.provider.recent().catch(() => this.recents);
  }

  async openFolder(): Promise<boolean> {
    const fs = await this.attempt(() => this.provider.openFolder());
    if (!fs) return false;
    await this.use(fs);
    return true;
  }

  async openBrowserWorkspace(): Promise<void> {
    const fs = await this.attempt(() => this.provider.browserWorkspace());
    if (fs) await this.use(fs);
  }

  async openExamples(file?: string): Promise<void> {
    if (this.fs?.kind !== 'examples') await this.use(this.provider.examples());
    if (file) await this.openFile(file);
  }

  async openRecent(id: string): Promise<void> {
    const r = await this.attempt(() => this.provider.openRecent(id));
    if (r) await this.use(r.fs, r.granted);
  }

  async allowAccess(): Promise<void> {
    if (!this.fs) return;
    const ok = await this.attempt(() => this.provider.requestAccess(this.fs!));
    if (ok) {
      this.needsAccess = false;
      await this.refresh();
      await this.restoreTabs();
    }
  }

  async refresh(): Promise<void> {
    const fs = this.fs;
    if (!fs || this.needsAccess) return;
    const entries = await this.attempt(() => fs.list());
    if (entries) {
      this.entries = entries;
      for (const e of entries)
        if (e.kind === 'directory' && this.expanded[e.path] === undefined)
          this.expanded[e.path] = e.depth === 0;
    }
  }

  toggleFolder(path: string): void {
    this.expanded[path] = !this.expanded[path];
  }

  // ---------- tabs ----------

  private persistTabs(): void {
    if (!this.fs) return;
    try {
      const files = this.tabs.filter((t) => t.kind === 'file').map((t) => t.key);
      localStorage.setItem(
        `${SESSION_KEY}:${this.fs.kind}:${this.fs.name}`,
        JSON.stringify({ files, active: this.activeFile?.key ?? null }),
      );
    } catch {
      // Optional convenience.
    }
  }

  private async restoreTabs(): Promise<void> {
    if (!this.fs) return;
    let saved: { files: string[]; active: string | null } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(`${SESSION_KEY}:${this.fs.kind}:${this.fs.name}`) ?? 'null');
    } catch {
      saved = null;
    }
    const known = new Set(this.entries.filter((e) => e.kind === 'file').map((e) => e.path));
    const files = saved?.files.filter((f) => known.has(f)) ?? [];
    if (files.length === 0) {
      const first = this.entries.find((e) => e.kind === 'file' && e.name.endsWith('.asm'));
      if (first) files.push(first.path);
    }
    for (const f of files) await this.openFile(f, false);
    const active = saved?.active && known.has(saved.active) ? saved.active : files[0];
    if (active) this.activeId = tabId('file', active);
  }

  activate(id: string): void {
    this.activeId = id;
    this.persistTabs();
  }

  async openFile(path: string, focus = true): Promise<Tab | null> {
    const id = tabId('file', path);
    const existing = this.tabs.find((t) => t.id === id);
    if (existing) {
      if (focus) this.activate(id);
      return existing;
    }
    const fs = this.fs;
    if (!fs) return null;
    const content = await this.attempt(() => fs.read(path));
    if (!content) return null;
    const tab: Tab = {
      id,
      kind: 'file',
      key: path,
      title: basename(path),
      text: content.text,
      saved: content.text,
      lastModified: content.lastModified,
      changedOnDisk: false,
    };
    this.tabs.push(tab);
    if (focus || !this.activeId) this.activate(id);
    else this.persistTabs();
    return this.tabs[this.tabs.length - 1]!;
  }

  openSpecial(kind: Exclude<TabKind, 'file'>, key: string, title: string): void {
    const id = tabId(kind, key);
    if (!this.tabs.some((t) => t.id === id)) {
      this.tabs.push({ id, kind, key, title, text: '', saved: '', lastModified: 0, changedOnDisk: false });
    }
    this.activate(id);
  }

  updateText(id: string, text: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) tab.text = text;
  }

  /** Closes a tab; with unsaved changes it asks first unless `force`. */
  close(id: string, force = false): CloseResult {
    const i = this.tabs.findIndex((t) => t.id === id);
    if (i < 0) return 'closed';
    const tab = this.tabs[i]!;
    if (!force && this.isDirty(tab)) return 'needs-confirm';
    this.tabs.splice(i, 1);
    if (this.activeId === id) this.activeId = (this.tabs[i] ?? this.tabs[i - 1])?.id ?? null;
    this.persistTabs();
    return 'closed';
  }

  closeOthers(id: string): Tab[] {
    const blocked: Tab[] = [];
    for (const t of [...this.tabs]) {
      if (t.id === id) continue;
      if (this.close(t.id) === 'needs-confirm') blocked.push(t);
    }
    return blocked;
  }

  moveTab(id: string, toIndex: number): void {
    const from = this.tabs.findIndex((t) => t.id === id);
    if (from < 0) return;
    const [tab] = this.tabs.splice(from, 1);
    this.tabs.splice(Math.max(0, Math.min(toIndex, this.tabs.length)), 0, tab!);
    this.persistTabs();
  }

  // ---------- saving ----------

  async save(id: string = this.activeId ?? ''): Promise<boolean> {
    const tab = this.tabs.find((t) => t.id === id);
    const fs = this.fs;
    if (!tab || tab.kind !== 'file' || !fs) return false;
    const text = tab.text;
    const lastModified = await this.attempt(() => fs.write(tab.key, text));
    if (lastModified === undefined) return false;
    tab.saved = text;
    tab.lastModified = lastModified;
    tab.changedOnDisk = false;
    await this.refresh();
    return true;
  }

  async saveAll(): Promise<number> {
    let n = 0;
    for (const t of this.dirtyTabs) if (await this.save(t.id)) n++;
    return n;
  }

  /** Downloads the active file (browsers without folder access, or "Download"). */
  download(id: string = this.activeId ?? ''): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab?.kind === 'file') this.provider.download(tab.title, tab.text);
  }

  // ---------- disk changes ----------

  /** Compares open files with the disk (called when the window regains focus). */
  async checkDisk(): Promise<void> {
    const fs = this.fs;
    if (!fs || this.needsAccess || fs.kind === 'examples') return;
    for (const tab of this.tabs) {
      if (tab.kind !== 'file') continue;
      const modified = await fs.stat(tab.key).catch(() => null);
      if (modified !== null && modified > tab.lastModified) {
        if (!this.isDirty(tab)) await this.reload(tab.id);
        else tab.changedOnDisk = true;
      }
    }
  }

  async reload(id: string): Promise<void> {
    const tab = this.tabs.find((t) => t.id === id);
    const fs = this.fs;
    if (!tab || !fs) return;
    const content = await this.attempt(() => fs.read(tab.key));
    if (!content) return;
    tab.text = content.text;
    tab.saved = content.text;
    tab.lastModified = content.lastModified;
    tab.changedOnDisk = false;
  }

  keepMine(id: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    tab.changedOnDisk = false;
    // Saving will now overwrite the disk copy on purpose.
    tab.lastModified = Number.MAX_SAFE_INTEGER;
  }

  // ---------- file operations ----------

  siblingsOf(dir: string): string[] {
    return this.entries.filter((e) => dirname(e.path) === dir).map((e) => e.name);
  }

  /** Free "untitled-N.asm" name in a folder. */
  freeName(dir: string, base = 'untitled', ext = '.asm'): string {
    const taken = new Set(this.siblingsOf(dir).map((n) => n.toLowerCase()));
    for (let i = 1; ; i++) {
      const name = i === 1 ? `${base}${ext}` : `${base}-${i}${ext}`;
      if (!taken.has(name.toLowerCase())) return name;
    }
  }

  async newFile(dir = '', name?: string, text = ''): Promise<string | null> {
    const fs = this.fs;
    if (!fs) return null;
    const fileName = name ?? this.freeName(dir);
    const problem = validateName(fileName, this.siblingsOf(dir));
    if (problem) {
      this.error = problem;
      return null;
    }
    const path = joinPath(dir, fileName);
    const ok = await this.attempt(() => fs.write(path, text));
    if (ok === undefined) return null;
    if (dir) this.expanded[dir] = true;
    await this.refresh();
    await this.openFile(path);
    return path;
  }

  async newFolder(dir = '', name?: string): Promise<string | null> {
    const fs = this.fs;
    if (!fs) return null;
    const folderName = name ?? this.freeName(dir, 'new-folder', '');
    const problem = validateName(folderName, this.siblingsOf(dir));
    if (problem) {
      this.error = problem;
      return null;
    }
    const path = joinPath(dir, folderName);
    const ok = await this.attempt(() => fs.createDirectory(path).then(() => true));
    if (!ok) return null;
    this.expanded[path] = true;
    await this.refresh();
    return path;
  }

  /** Returns an error message, or null after renaming. Open tabs follow the file. */
  async rename(path: string, newName: string): Promise<string | null> {
    const fs = this.fs;
    if (!fs) return 'No workspace open.';
    const dir = dirname(path);
    if (newName.trim() === basename(path)) return null;
    const problem = validateName(
      newName,
      this.siblingsOf(dir).filter((n) => n !== basename(path)),
    );
    if (problem) return problem;
    const to = joinPath(dir, newName.trim());
    const ok = await this.attempt(() => fs.rename(path, to).then(() => true));
    if (!ok) return this.error;
    for (const t of this.tabs) {
      if (t.kind === 'file' && (t.key === path || t.key.startsWith(path + '/'))) {
        const key = to + t.key.slice(path.length);
        const wasActive = this.activeId === t.id;
        Object.assign(t, { id: tabId('file', key), key, title: basename(key) });
        if (wasActive) this.activeId = t.id;
      }
    }
    if (this.expanded[path] !== undefined) this.expanded[to] = this.expanded[path]!;
    await this.refresh();
    this.persistTabs();
    return null;
  }

  async remove(path: string): Promise<boolean> {
    const fs = this.fs;
    if (!fs) return false;
    const ok = await this.attempt(() => fs.remove(path).then(() => true));
    if (!ok) return false;
    for (const t of [...this.tabs]) {
      if (t.kind === 'file' && (t.key === path || t.key.startsWith(path + '/'))) this.close(t.id, true);
    }
    await this.refresh();
    return true;
  }

  async duplicate(path: string): Promise<string | null> {
    const fs = this.fs;
    if (!fs) return null;
    const content = await this.attempt(() => fs.read(path));
    if (!content) return null;
    const dir = dirname(path);
    const name = basename(path);
    const dot = name.lastIndexOf('.');
    const copy = this.freeName(
      dir,
      `${dot > 0 ? name.slice(0, dot) : name}-copy`,
      dot > 0 ? name.slice(dot) : '',
    );
    return this.newFile(dir, copy, content.text);
  }

  /** Imports picked files into the workspace (browser workspace, Open file…). */
  async importFiles(): Promise<number> {
    const picked = await this.attempt(() => this.provider.pickFiles());
    if (!picked?.length) return 0;
    if (!this.fs || this.fs.kind === 'examples') await this.openBrowserWorkspace();
    let last: string | null = null;
    for (const f of picked) {
      const name = this.siblingsOf('').some((n) => n.toLowerCase() === f.name.toLowerCase())
        ? this.freeName('', f.name.replace(/\.[^.]+$/, ''), f.name.match(/\.[^.]+$/)?.[0] ?? '.asm')
        : f.name;
      last = await this.newFile('', name, f.text);
    }
    if (last) await this.openFile(last);
    return picked.length;
  }
}
