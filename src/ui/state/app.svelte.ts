import { getContext, setContext } from 'svelte';
import { assemble, findInstruction, type Assembly } from '@core/index';
import type { RunnerPort } from '@app/run/protocol';
import { SPEEDS, speedLabel } from '@app/run/protocol';
import type { SettingsRepository } from '@app/settings/settings';
import { DEFAULT_PROGRAM } from '@app/workspace/examples';
import type { WorkspaceProvider } from '@app/workspace/workspace-provider';
import { applyTheme } from '../theme/themes';
import { displayKeys, Keymap, type Command } from './commands';
import { SessionState } from './session.svelte';
import { SettingsState } from './settings.svelte';
import { UiState, type Layout } from './ui.svelte';
import { WorkspaceState } from './workspace.svelte';

/** What the editor exposes so commands can act on it. */
export interface EditorBridge {
  insert(text: string): void;
  gotoLine(line: number): void;
  focus(): void;
  toggleBreakpointAtCursor(): void;
  cursorLine(): number;
}

export interface AppDeps {
  readonly runner: RunnerPort;
  readonly provider: WorkspaceProvider;
  readonly settingsRepo: SettingsRepository;
}

const KEY = Symbol('asm8-app');

/**
 * Composition root of the UI: owns the state containers and the high-level actions that need more
 * than one of them (run the active file, close with unsaved changes, delete with confirmation…).
 */
export class AppController {
  readonly settings: SettingsState;
  readonly workspace: WorkspaceState;
  readonly session: SessionState;
  readonly ui = new UiState();
  readonly keymap: Keymap;
  editor = $state.raw<EditorBridge | null>(null);
  /** Cursor position for the status bar (1-based). */
  cursor = $state({ line: 1, col: 1 });
  installAvailable = $state(false);
  installed = $state(false);
  private installPrompt: (() => Promise<boolean>) | null = null;

  constructor(deps: AppDeps) {
    this.settings = new SettingsState(deps.settingsRepo);
    this.workspace = new WorkspaceState(deps.provider);
    this.session = new SessionState(deps.runner);
    this.session.speed = this.settings.value.defaultSpeed;
    this.keymap = new Keymap(() => this.commands);
  }

  static provide(app: AppController): void {
    setContext(KEY, app);
  }

  static use(): AppController {
    const app = getContext<AppController | undefined>(KEY);
    if (!app) throw new Error('AppController missing: wrap the tree in <App>');
    return app;
  }

  // ---------- derived ----------

  /** Assembly of the active file, recomputed as the user types (cheap: programs are ≤ 256 bytes). */
  readonly activeAssembly: Assembly | null = $derived.by(() => {
    const tab = this.workspace.activeFile;
    return tab ? assemble(tab.text) : null;
  });

  get activePath(): string | null {
    return this.workspace.activeFile?.key ?? null;
  }

  /** The loaded program is the file in the editor (so the current line can be shown there). */
  get showsLoadedProgram(): boolean {
    return this.session.program !== null && this.session.program.path === this.activePath;
  }

  // ---------- lifecycle ----------

  async start(): Promise<void> {
    applyTheme(this.settings.value.theme);
    this.applySettings();
    await this.workspace.init();
  }

  applySettings(): void {
    const s = this.settings.value;
    this.session.pauseOnFault = s.pauseOnFault;
    this.session.scrollback = s.scrollback;
    document.documentElement.style.setProperty('--code-size', `${s.fontSize}px`);
  }

  setLayout(layout: Layout): void {
    this.ui.layout = layout;
  }

  setInstallPrompt(prompt: (() => Promise<boolean>) | null): void {
    this.installPrompt = prompt;
    this.installAvailable = prompt !== null;
  }

  async install(): Promise<void> {
    if (!this.installPrompt) return;
    const accepted = await this.installPrompt();
    if (accepted) {
      this.installAvailable = false;
      this.installed = true;
      this.ui.toast('Asm8 is installed. Open it from your apps.', 'positive');
    }
  }

  // ---------- run ----------

  private withActive(fn: (path: string, source: string) => void): void {
    const tab = this.workspace.activeFile;
    if (tab) fn(tab.key, tab.text);
    else if (this.session.program) fn(this.session.program.path, this.session.program.source);
    else this.ui.toast('Open an .asm file to run it.');
  }

  run(): void {
    if (this.session.running) return;
    this.withActive((p, s) => {
      this.session.run(p, s);
      if (!this.session.program || this.session.program.path !== p || this.session.program.source !== s)
        this.ui.panelTab = 'problems';
    });
  }

  toggleRun(): void {
    if (this.session.running) this.session.pause();
    else this.run();
  }

  step(kind: 'step' | 'stepOver' | 'stepOut' = 'step'): void {
    this.withActive((p, s) => this.session.step(p, s, kind));
  }

  reset(): void {
    if (this.session.state === 'empty' || this.session.state === 'ready') return;
    this.session.reset();
    this.ui.toast('Machine reset', 'info', { label: 'Undo', run: () => this.session.undoReset() }, 6000);
  }

  restart(): void {
    this.session.stop();
    this.run();
  }

  setSpeed(speed: (typeof SPEEDS)[number]): void {
    this.session.setSpeed(speed);
  }

  toggleBreakpoint(line?: number): void {
    const path = this.activePath;
    if (!path) return;
    const at = line ?? this.editor?.cursorLine();
    if (at === undefined) return;
    this.session.toggleBreakpoint(path, at);
  }

  // ---------- files ----------

  async save(): Promise<void> {
    const tab = this.workspace.activeFile;
    if (!tab) return;
    if (!this.workspace.fs) {
      this.workspace.download(tab.id);
      return;
    }
    if (await this.workspace.save(tab.id)) {
      this.ui.toast(
        this.workspace.fs.kind === 'folder'
          ? `Saved ${tab.title} to disk`
          : `Saved ${tab.title} in the browser workspace`,
        'positive',
        undefined,
        2500,
      );
    }
  }

  async saveAll(): Promise<void> {
    const n = await this.workspace.saveAll();
    if (n) this.ui.toast(`Saved ${n} file${n === 1 ? '' : 's'}`, 'positive', undefined, 2500);
  }

  async closeTab(id: string): Promise<void> {
    if (this.workspace.close(id) === 'closed') return;
    const tab = this.workspace.tabs.find((t) => t.id === id);
    if (!tab) return;
    const choice = await this.ui.confirm({
      title: `Save changes to ${tab.title}?`,
      body: 'Your changes will be lost if you close without saving.',
      confirm: 'Save',
      alternate: "Don't save",
    });
    if (choice === 'cancel') return;
    if (choice === 'confirm' && !(await this.workspace.save(id))) return;
    this.workspace.close(id, true);
  }

  async closeOthers(id: string): Promise<void> {
    for (const t of this.workspace.closeOthers(id)) await this.closeTab(t.id);
  }

  async deletePath(path: string, isFolder: boolean): Promise<void> {
    const name = path.slice(path.lastIndexOf('/') + 1);
    const where = this.workspace.fs?.kind === 'folder' ? 'from your disk' : 'from the browser workspace';
    const choice = await this.ui.confirm({
      title: `Delete ${name}?`,
      body: isFolder
        ? `The folder and everything in it will be deleted ${where}. This cannot be undone.`
        : `The file will be deleted ${where}. This cannot be undone.`,
      confirm: 'Delete',
      danger: true,
    });
    if (choice !== 'confirm') return;
    if (await this.workspace.remove(path)) this.ui.toast(`Deleted ${name}`);
  }

  async newFile(dir = ''): Promise<void> {
    if (!this.workspace.fs) await this.workspace.openBrowserWorkspace();
    const path = await this.workspace.newFile(dir);
    if (path) this.workspace.renaming = path;
  }

  async newFolder(dir = ''): Promise<void> {
    if (!this.workspace.fs) await this.workspace.openBrowserWorkspace();
    const path = await this.workspace.newFolder(dir);
    if (path) this.workspace.renaming = path;
  }

  async openFolder(): Promise<void> {
    if (!this.workspace.provider.canOpenFolders) {
      await this.workspace.openBrowserWorkspace();
      this.ui.toast('This browser cannot open folders: using the browser workspace.');
      return;
    }
    await this.workspace.openFolder();
  }

  async openExample(file: string): Promise<void> {
    await this.workspace.openExamples(file);
  }

  /** First run in an empty browser workspace: give it the hello example so there is something to run. */
  async seedBrowserWorkspace(): Promise<void> {
    await this.workspace.openBrowserWorkspace();
    if (this.workspace.entries.length === 0) await this.workspace.newFile('', 'hello.asm', DEFAULT_PROGRAM);
  }

  // ---------- views ----------

  openSettings(): void {
    this.workspace.openSpecial('settings', 'settings', 'Settings');
  }

  openReference(mnemonic: string): void {
    const doc = findInstruction(mnemonic);
    if (doc) this.workspace.openSpecial('reference', doc.mnemonic, `${doc.mnemonic} · reference`);
  }

  insertExample(text: string): void {
    if (!this.workspace.activeFile) {
      this.ui.toast('Open a file to insert the example.');
      return;
    }
    const file = this.workspace.tabs.find((t) => t.kind === 'file');
    if (this.workspace.active?.kind !== 'file' && file) this.workspace.activate(file.id);
    queueMicrotask(() => this.editor?.insert(text));
  }

  revealLine(line: number): void {
    const path = this.session.program?.path;
    if (path && path !== this.activePath) void this.workspace.openFile(path);
    queueMicrotask(() => this.editor?.gotoLine(line));
    if (this.ui.layout === 'phone') this.ui.phoneRegion = 'code';
  }

  // ---------- commands ----------

  get commands(): Command[] {
    const s = this.session;
    const ui = this.ui;
    const ws = this.workspace;
    const hasFile = () => ws.activeFile !== null;
    const canStep = () => !s.running && (hasFile() || s.program !== null);
    const cmds: Command[] = [
      {
        id: 'run.start',
        category: 'Run',
        title: 'Start',
        keys: 'F5',
        run: () => (s.running ? s.pause() : this.run()),
      },
      {
        id: 'run.step',
        category: 'Run',
        title: 'Step',
        keys: 'F10',
        run: () => this.step(),
        enabled: canStep,
      },
      {
        id: 'run.over',
        category: 'Run',
        title: 'Step over CALL',
        keys: 'F11',
        run: () => this.step('stepOver'),
        enabled: canStep,
      },
      {
        id: 'run.out',
        category: 'Run',
        title: 'Step out of CALL',
        keys: 'Shift+F11',
        run: () => this.step('stepOut'),
        enabled: canStep,
      },
      {
        id: 'run.restart',
        category: 'Run',
        title: 'Restart',
        keys: 'Ctrl+Shift+F5',
        run: () => this.restart(),
      },
      { id: 'run.stop', category: 'Run', title: 'Stop', keys: 'Shift+F5', run: () => s.stop() },
      { id: 'run.reset', category: 'Run', title: 'Reset machine', run: () => this.reset() },
      { id: 'run.pause', category: 'Run', title: 'Pause', run: () => s.pause(), enabled: () => s.running },
      ...SPEEDS.map((sp) => ({
        id: `run.speed.${sp}`,
        category: 'Run',
        title: `Set speed: ${speedLabel(sp)}`,
        run: () => this.setSpeed(sp),
      })),
      {
        id: 'run.breakpoint',
        category: 'Run',
        title: 'Toggle breakpoint',
        keys: 'F9',
        run: () => this.toggleBreakpoint(),
        enabled: hasFile,
      },
      {
        id: 'run.clearBreakpoints',
        category: 'Run',
        title: 'Remove all breakpoints',
        run: () => s.clearBreakpoints(),
      },
      {
        id: 'file.save',
        category: 'File',
        title: 'Save',
        keys: 'Ctrl+S',
        run: () => void this.save(),
        enabled: hasFile,
      },
      {
        id: 'file.saveAll',
        category: 'File',
        title: 'Save all',
        keys: 'Ctrl+Alt+S',
        run: () => void this.saveAll(),
      },
      { id: 'file.new', category: 'File', title: 'New file', keys: 'Alt+N', run: () => void this.newFile() },
      { id: 'file.newFolder', category: 'File', title: 'New folder', run: () => void this.newFolder() },
      {
        id: 'file.openFolder',
        category: 'File',
        title: 'Open folder…',
        keys: 'Ctrl+K O',
        run: () => void this.openFolder(),
      },
      {
        id: 'file.openFile',
        category: 'File',
        title: 'Open file…',
        keys: 'Ctrl+O',
        run: () => void ws.importFiles(),
      },
      {
        id: 'file.browser',
        category: 'File',
        title: 'Open browser workspace',
        run: () => void ws.openBrowserWorkspace(),
      },
      {
        id: 'file.examples',
        category: 'File',
        title: 'Open examples',
        run: () => void ws.openExamples('hello.asm'),
      },
      {
        id: 'file.download',
        category: 'File',
        title: 'Download file',
        run: () => ws.download(),
        enabled: hasFile,
      },
      {
        id: 'file.close',
        category: 'File',
        title: 'Close editor',
        keys: 'Alt+W',
        run: () => ws.activeId && void this.closeTab(ws.activeId),
      },
      {
        id: 'go.file',
        category: 'Go',
        title: 'Go to file…',
        keys: 'Ctrl+P',
        run: () => (ui.overlay = { kind: 'palette', mode: 'files' }),
      },
      {
        id: 'go.commands',
        category: 'View',
        title: 'Command palette',
        keys: 'Ctrl+Shift+P',
        run: () => (ui.overlay = { kind: 'palette', mode: 'commands' }),
      },
      {
        id: 'view.explorer',
        category: 'View',
        title: 'Show explorer',
        keys: 'Ctrl+Shift+E',
        run: () => (ui.sideView = 'explorer'),
      },
      {
        id: 'view.search',
        category: 'View',
        title: 'Search in files',
        keys: 'Ctrl+Shift+F',
        run: () => (ui.sideView = 'search'),
      },
      {
        id: 'view.debug',
        category: 'View',
        title: 'Show run and debug',
        keys: 'Ctrl+Shift+D',
        run: () => (ui.sideView = 'debug'),
      },
      {
        id: 'view.reference',
        category: 'View',
        title: 'Show instruction set',
        keys: 'Ctrl+Shift+I',
        run: () => (ui.sideView = 'reference'),
      },
      {
        id: 'view.sidebar',
        category: 'View',
        title: 'Toggle side bar',
        keys: 'Ctrl+B',
        run: () => (ui.sideView = ui.sideView ? null : 'explorer'),
      },
      {
        id: 'view.console',
        category: 'View',
        title: 'Show console',
        keys: 'Ctrl+J',
        run: () => (ui.panelTab = 'console'),
      },
      {
        id: 'view.problems',
        category: 'View',
        title: 'Show problems',
        keys: 'Ctrl+Shift+M',
        run: () => (ui.panelTab = 'problems'),
      },
      { id: 'view.display', category: 'View', title: 'Show display', run: () => (ui.panelTab = 'display') },
      {
        id: 'view.writes',
        category: 'View',
        title: 'Show memory writes',
        run: () => (ui.panelTab = 'writes'),
      },
      {
        id: 'view.clearConsole',
        category: 'View',
        title: 'Clear console',
        keys: 'Ctrl+L',
        run: () => s.clearConsole(),
      },
      {
        id: 'pref.settings',
        category: 'Preferences',
        title: 'Open settings',
        keys: 'Ctrl+,',
        run: () => this.openSettings(),
      },
      {
        id: 'pref.theme',
        category: 'Preferences',
        title: 'Color theme…',
        keys: 'Ctrl+K T',
        run: () => (ui.overlay = { kind: 'themes' }),
      },
      {
        id: 'pref.shortcuts',
        category: 'Preferences',
        title: 'Keyboard shortcuts',
        keys: 'Ctrl+K S',
        run: () => (ui.overlay = { kind: 'shortcuts' }),
      },
      {
        id: 'help.about',
        category: 'Help',
        title: 'About Asm8',
        run: () => (ui.overlay = { kind: 'about' }),
      },
    ];
    if (this.installAvailable)
      cmds.push({
        id: 'app.install',
        category: 'App',
        title: 'Install Asm8',
        run: () => void this.install(),
      });
    return cmds;
  }

  keysFor(id: string): string | undefined {
    const k = this.commands.find((c) => c.id === id)?.keys;
    return k ? displayKeys(k) : undefined;
  }
}
