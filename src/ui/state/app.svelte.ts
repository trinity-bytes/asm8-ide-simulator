import { getContext, setContext } from 'svelte';
import { assemble, findInstruction, type Assembly } from '@core/index';
import type { RunnerPort } from '@app/run/protocol';
import { SPEEDS, speedLabel } from '@app/run/protocol';
import type { SettingsRepository } from '@app/settings/settings';
import { DEFAULT_PROGRAM } from '@app/workspace/examples';
import type { WorkspaceProvider } from '@app/workspace/workspace-provider';
import { translateCoreMessage } from '../i18n/core-messages';
import { applyLanguage, i18n, t, tn } from '../i18n/i18n.svelte';
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
    this.workspace.onRenamed = (from, to) => this.session.renamePath(from, to);
    this.workspace.beforeSwitch = async (dirty) => {
      const names = dirty.map((t) => t.title).join(', ');
      const choice = await this.ui.confirm({
        title:
          dirty.length === 1
            ? t('state.confirm.saveOne', { name: names })
            : t('state.confirm.saveMany', { n: dirty.length }),
        body: dirty.length === 1 ? t('state.confirm.switchOne') : t('state.confirm.switchMany', { names }),
        confirm: t('common.save'),
        alternate: t('state.confirm.dontSave'),
      });
      if (choice === 'cancel') return false;
      if (choice === 'confirm') return (await this.workspace.saveAll()) === dirty.length;
      return true;
    };
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
  private readonly rawAssembly: Assembly | null = $derived.by(() => {
    const tab = this.workspace.currentFile;
    return tab ? assemble(tab.text) : null;
  });

  /** The same assembly with its diagnostics in the current language (identical object in English). */
  readonly activeAssembly: Assembly | null = $derived.by(() => {
    const a = this.rawAssembly;
    if (!a || i18n.locale === 'en' || a.diagnostics.length === 0) return a;
    return {
      ...a,
      diagnostics: a.diagnostics.map((d) => ({
        ...d,
        message: translateCoreMessage(d.message),
        ...(d.fix ? { fix: { ...d.fix, title: translateCoreMessage(d.fix.title) } } : {}),
      })),
    };
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
    applyLanguage(s.language);
    this.workspace.retitleSpecial((kind, key) => this.specialTitle(kind, key));
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
      this.ui.toast(t('state.toast.installed'), 'positive');
    }
  }

  // ---------- run ----------

  private withActive(fn: (path: string, source: string) => void): void {
    const tab = this.workspace.currentFile;
    if (tab) fn(tab.key, tab.text);
    else if (this.session.program) fn(this.session.program.path, this.session.program.source);
    else this.ui.toast(t('state.toast.openToRun'));
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
    this.ui.toast(
      t('state.toast.machineReset'),
      'info',
      { label: t('state.toast.undo'), run: () => this.session.undoReset() },
      6000,
    );
  }

  restart(): void {
    this.withActive((p, s) => this.session.restart(p, s));
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
          ? t('state.toast.savedDisk', { name: tab.title })
          : t('state.toast.savedBrowser', { name: tab.title }),
        'positive',
        undefined,
        2500,
      );
    }
  }

  async saveAll(): Promise<void> {
    const n = await this.workspace.saveAll();
    if (n) this.ui.toast(tn('state.toast.savedFiles', n), 'positive', undefined, 2500);
  }

  async closeTab(id: string): Promise<void> {
    if (this.workspace.close(id) === 'closed') return;
    const tab = this.workspace.tabs.find((t) => t.id === id);
    if (!tab) return;
    const choice = await this.ui.confirm({
      title: t('state.confirm.saveOne', { name: tab.title }),
      body: t('state.confirm.closeBody'),
      confirm: t('common.save'),
      alternate: t('state.confirm.dontSave'),
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
    const disk = this.workspace.fs?.kind === 'folder';
    const choice = await this.ui.confirm({
      title: t('state.confirm.deleteTitle', { name }),
      body: isFolder
        ? t(disk ? 'state.confirm.deleteFolder' : 'state.confirm.deleteFolderBrowser')
        : t(disk ? 'state.confirm.deleteFile' : 'state.confirm.deleteFileBrowser'),
      confirm: t('state.confirm.delete'),
      danger: true,
    });
    if (choice !== 'confirm') return;
    if (await this.workspace.remove(path)) this.ui.toast(t('state.toast.deleted', { name }));
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

  /** Real folders on Chromium desktop; phones and other browsers use the browser workspace. */
  get canOpenFolders(): boolean {
    return this.workspace.provider.canOpenFolders && this.ui.layout !== 'phone';
  }

  async openFolder(): Promise<void> {
    if (this.ui.layout === 'phone') {
      await this.seedBrowserWorkspace();
      if (this.workspace.activeFile) this.ui.phoneRegion = 'code';
      return;
    }
    if (!this.workspace.provider.canOpenFolders) {
      await this.workspace.openBrowserWorkspace();
      this.ui.toast(t('state.toast.noFolders'));
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
    this.workspace.openSpecial('settings', 'settings', this.specialTitle('settings', 'settings'));
  }

  openReference(mnemonic: string): void {
    const doc = findInstruction(mnemonic);
    if (doc)
      this.workspace.openSpecial('reference', doc.mnemonic, this.specialTitle('reference', doc.mnemonic));
  }

  /** Title of a settings or reference tab in the current language. */
  private specialTitle(kind: 'settings' | 'reference', key: string): string {
    return kind === 'settings' ? t('state.tab.settings') : t('state.tab.reference', { mnemonic: key });
  }

  insertExample(text: string): void {
    if (!this.workspace.activeFile) {
      this.ui.toast(t('state.toast.openToInsert'));
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
    const cat = {
      run: t('state.category.run'),
      file: t('state.category.file'),
      go: t('state.category.go'),
      view: t('state.category.view'),
      preferences: t('state.category.preferences'),
      help: t('state.category.help'),
      app: t('state.category.app'),
    };
    const cmds: Command[] = [
      {
        id: 'run.start',
        category: cat.run,
        title: t('state.cmd.start'),
        keys: 'F5',
        run: () => (s.running ? s.pause() : this.run()),
      },
      {
        id: 'run.step',
        category: cat.run,
        title: t('state.cmd.step'),
        keys: 'F10',
        run: () => this.step(),
        enabled: canStep,
      },
      {
        id: 'run.over',
        category: cat.run,
        title: t('state.cmd.stepOver'),
        keys: 'F11',
        run: () => this.step('stepOver'),
        enabled: canStep,
      },
      {
        id: 'run.out',
        category: cat.run,
        title: t('state.cmd.stepOut'),
        keys: 'Shift+F11',
        run: () => this.step('stepOut'),
        enabled: canStep,
      },
      {
        id: 'run.restart',
        category: cat.run,
        title: t('state.cmd.restart'),
        keys: 'Ctrl+Shift+F5',
        run: () => this.restart(),
      },
      {
        id: 'run.stop',
        category: cat.run,
        title: t('state.cmd.stop'),
        keys: 'Shift+F5',
        run: () => s.stop(),
      },
      { id: 'run.reset', category: cat.run, title: t('state.cmd.reset'), run: () => this.reset() },
      {
        id: 'run.pause',
        category: cat.run,
        title: t('state.cmd.pause'),
        run: () => s.pause(),
        enabled: () => s.running,
      },
      ...SPEEDS.map((sp) => ({
        id: `run.speed.${sp}`,
        category: cat.run,
        title: t('state.cmd.speed', { speed: speedLabel(sp) }),
        run: () => this.setSpeed(sp),
      })),
      {
        id: 'run.breakpoint',
        category: cat.run,
        title: t('state.cmd.breakpoint'),
        keys: 'F9',
        run: () => this.toggleBreakpoint(),
        enabled: hasFile,
      },
      {
        id: 'run.clearBreakpoints',
        category: cat.run,
        title: t('state.cmd.clearBreakpoints'),
        run: () => s.clearBreakpoints(),
      },
      {
        id: 'file.save',
        category: cat.file,
        title: t('state.cmd.save'),
        keys: 'Ctrl+S',
        run: () => void this.save(),
        enabled: hasFile,
      },
      {
        id: 'file.saveAll',
        category: cat.file,
        title: t('state.cmd.saveAll'),
        keys: 'Ctrl+Alt+S',
        run: () => void this.saveAll(),
      },
      {
        id: 'file.new',
        category: cat.file,
        title: t('state.cmd.newFile'),
        keys: 'Alt+N',
        run: () => void this.newFile(),
      },
      {
        id: 'file.newFolder',
        category: cat.file,
        title: t('state.cmd.newFolder'),
        run: () => void this.newFolder(),
      },
      {
        id: 'file.openFolder',
        category: cat.file,
        title: t('state.cmd.openFolder'),
        keys: 'Ctrl+K O',
        run: () => void this.openFolder(),
      },
      {
        id: 'file.openFile',
        category: cat.file,
        title: t('state.cmd.openFile'),
        keys: 'Ctrl+O',
        run: () => void ws.importFiles(),
      },
      {
        id: 'file.browser',
        category: cat.file,
        title: t('state.cmd.browser'),
        run: () => void ws.openBrowserWorkspace(),
      },
      {
        id: 'file.examples',
        category: cat.file,
        title: t('state.cmd.examples'),
        run: () => void ws.openExamples('hello.asm'),
      },
      {
        id: 'file.download',
        category: cat.file,
        title: t('state.cmd.download'),
        run: () => ws.download(),
        enabled: hasFile,
      },
      {
        id: 'file.close',
        category: cat.file,
        title: t('state.cmd.close'),
        keys: 'Alt+W',
        run: () => ws.activeId && void this.closeTab(ws.activeId),
      },
      {
        id: 'go.file',
        category: cat.go,
        title: t('state.cmd.goFile'),
        keys: 'Ctrl+P',
        run: () => (ui.overlay = { kind: 'palette', mode: 'files' }),
      },
      {
        id: 'go.commands',
        category: cat.view,
        title: t('state.cmd.palette'),
        keys: 'Ctrl+Shift+P',
        run: () => (ui.overlay = { kind: 'palette', mode: 'commands' }),
      },
      {
        id: 'view.explorer',
        category: cat.view,
        title: t('state.cmd.explorer'),
        keys: 'Ctrl+Shift+E',
        run: () => (ui.sideView = 'explorer'),
      },
      {
        id: 'view.search',
        category: cat.view,
        title: t('state.cmd.search'),
        keys: 'Ctrl+Shift+F',
        run: () => (ui.sideView = 'search'),
      },
      {
        id: 'view.debug',
        category: cat.view,
        title: t('state.cmd.debug'),
        keys: 'Ctrl+Shift+D',
        run: () => (ui.sideView = 'debug'),
      },
      {
        id: 'view.reference',
        category: cat.view,
        title: t('state.cmd.reference'),
        keys: 'Ctrl+Shift+I',
        run: () => (ui.sideView = 'reference'),
      },
      {
        id: 'view.sidebar',
        category: cat.view,
        title: t('state.cmd.sidebar'),
        keys: 'Ctrl+B',
        run: () => (ui.sideView = ui.sideView ? null : 'explorer'),
      },
      {
        id: 'view.console',
        category: cat.view,
        title: t('state.cmd.console'),
        keys: 'Ctrl+J',
        run: () => (ui.panelTab = 'console'),
      },
      {
        id: 'view.problems',
        category: cat.view,
        title: t('state.cmd.problems'),
        keys: 'Ctrl+Shift+M',
        run: () => (ui.panelTab = 'problems'),
      },
      {
        id: 'view.display',
        category: cat.view,
        title: t('state.cmd.display'),
        run: () => (ui.panelTab = 'display'),
      },
      {
        id: 'view.writes',
        category: cat.view,
        title: t('state.cmd.writes'),
        run: () => (ui.panelTab = 'writes'),
      },
      {
        id: 'view.clearConsole',
        category: cat.view,
        title: t('state.cmd.clearConsole'),
        keys: 'Ctrl+L',
        run: () => s.clearConsole(),
      },
      {
        id: 'pref.settings',
        category: cat.preferences,
        title: t('state.cmd.settings'),
        keys: 'Ctrl+,',
        run: () => this.openSettings(),
      },
      {
        id: 'pref.theme',
        category: cat.preferences,
        title: t('state.cmd.theme'),
        keys: 'Ctrl+K T',
        run: () => (ui.overlay = { kind: 'themes' }),
      },
      {
        id: 'pref.shortcuts',
        category: cat.preferences,
        title: t('state.cmd.shortcuts'),
        keys: 'Ctrl+K S',
        run: () => (ui.overlay = { kind: 'shortcuts' }),
      },
      {
        id: 'help.about',
        category: cat.help,
        title: t('state.cmd.about'),
        run: () => (ui.overlay = { kind: 'about' }),
      },
    ];
    if (this.installAvailable)
      cmds.push({
        id: 'app.install',
        category: cat.app,
        title: t('state.cmd.install'),
        run: () => void this.install(),
      });
    return cmds;
  }

  keysFor(id: string): string | undefined {
    const k = this.commands.find((c) => c.id === id)?.keys;
    return k ? displayKeys(k) : undefined;
  }
}
