<script lang="ts">
  import { hex } from '@core/index';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';
  import IconButton from '../atoms/IconButton.svelte';
  import type { IconName } from '../atoms/icons';
  import EditorGroup from '../organisms/editor/EditorGroup.svelte';
  import MachinePanel from '../organisms/MachinePanel.svelte';
  import ConsoleView from '../organisms/panel/ConsoleView.svelte';
  import ProblemsView from '../organisms/panel/ProblemsView.svelte';
  import DebugView from '../organisms/side/DebugView.svelte';
  import ReferenceView from '../organisms/side/ReferenceView.svelte';
  import SearchView from '../organisms/side/SearchView.svelte';
  import { AppController } from '../state/app.svelte';
  import type { PhoneRegion } from '../state/ui.svelte';
  import SideBar from './SideBar.svelte';

  const app = AppController.use();
  const ui = app.ui;
  const s = app.session;
  const ws = app.workspace;
  let more = $state<'menu' | 'search' | 'reference' | 'debug' | 'problems'>('menu');
  let editing = $state(false);

  const NAV: { id: PhoneRegion; label: string; icon: IconName }[] = [
    { id: 'code', label: 'Code', icon: 'file' },
    { id: 'machine', label: 'Machine', icon: 'cpu' },
    { id: 'console', label: 'Console', icon: 'console' },
    { id: 'files', label: 'Files', icon: 'explorer' },
    { id: 'more', label: 'More', icon: 'more' },
  ];

  const title = $derived(ws.active?.title ?? 'Asm8');
  const stateLine = $derived.by(() => {
    const snap = s.snapshot;
    switch (s.state) {
      case 'running':
        return `Running · step ${snap?.steps ?? 0}`;
      case 'waiting':
        return 'Waiting for a key · port 0x00';
      case 'paused':
        return `Paused at line ${(snap?.line ?? 0) + 1} · step ${snap?.steps ?? 0}`;
      case 'halted':
        return `Halted · ${snap?.steps ?? 0} steps`;
      case 'fault':
        return `Error: ${snap?.fault ?? ''}`;
      default:
        return ws.fs ? (ws.fs.kind === 'examples' ? 'Example' : 'Browser workspace') : 'No file open';
    }
  });
  const primary = $derived(
    s.running
      ? { label: 'Pause', icon: 'pause' as const }
      : s.state === 'paused' || s.state === 'waiting'
        ? { label: 'Continue', icon: 'play' as const }
        : { label: 'Run', icon: 'play' as const },
  );
  const firstError = $derived(app.activeAssembly?.diagnostics.find((d) => d.severity === 'error'));
  const ACCESSORY = ['Tab', 'A', 'B', 'C', 'D', '[', ']', ',', 'MOV', 'CMP', 'JMP', 'JNZ'];

  // The accessory row shows while the code editor has focus (the phone keyboard is up).
  function onfocusin(e: FocusEvent) {
    editing = (e.target as HTMLElement).closest('.cm-editor') !== null;
  }
  function onfocusout() {
    setTimeout(
      () => (editing = (document.activeElement as HTMLElement | null)?.closest('.cm-editor') !== null),
      0,
    );
  }

  function accessory(key: string) {
    const text = key === 'Tab' ? '\t' : key.length > 1 ? `${key} ` : key === ',' ? ', ' : key;
    app.editor?.insert(text);
  }

  function applyFix() {
    const d = firstError;
    const tab = ws.activeFile;
    if (!d?.fix || !tab) return;
    const lines = tab.text.split('\n');
    const t = lines[d.line] ?? '';
    lines[d.line] = t.slice(0, d.from) + d.fix.replacement + t.slice(d.to);
    ws.updateText(tab.id, lines.join('\n'));
  }

  function go(region: PhoneRegion) {
    ui.phoneRegion = region;
    if (region === 'more') more = 'menu';
  }
</script>

<div class="phone">
  <header class="top">
    <div class="who">
      <strong>{title}</strong>
      <span class="state {s.state}"><span class="dot"></span>{stateLine}</span>
    </div>
    <Button
      variant="primary"
      size="lg"
      icon={primary.icon}
      disabled={!ws.currentFile && !s.program}
      onclick={() => app.toggleRun()}>{primary.label}</Button
    >
    <IconButton
      icon="step"
      label="Step"
      size="touch"
      disabled={s.running || (!ws.currentFile && !s.program)}
      onclick={() => app.step()}
    />
  </header>

  <main class="region" {onfocusin} {onfocusout}>
    {#if ui.phoneRegion === 'code'}
      <EditorGroup compact showTabs={false} />
    {:else if ui.phoneRegion === 'machine'}
      <MachinePanel embedded />
    {:else if ui.phoneRegion === 'console'}
      <ConsoleView touch />
    {:else if ui.phoneRegion === 'files'}
      <SideBar touch onopened={() => (ui.phoneRegion = 'code')} />
    {:else}
      <div class="more">
        {#if more === 'menu'}
          <ul>
            <li>
              <button type="button" onclick={() => (more = 'problems')}
                ><Icon name="error" />Problems<span>{app.activeAssembly?.diagnostics.length ?? 0}</span
                ></button
              >
            </li>
            <li>
              <button type="button" onclick={() => (more = 'debug')}
                ><Icon name="debug" />Run and debug</button
              >
            </li>
            <li>
              <button type="button" onclick={() => (more = 'search')}><Icon name="search" />Search</button>
            </li>
            <li>
              <button type="button" onclick={() => (more = 'reference')}
                ><Icon name="reference" />Instruction set</button
              >
            </li>
            <li>
              <button type="button" onclick={() => ((ui.phoneRegion = 'code'), app.openSettings())}
                ><Icon name="settings" />Settings</button
              >
            </li>
            <li>
              <button type="button" onclick={() => (ui.overlay = { kind: 'themes' })}
                ><Icon name="palette" />Color theme</button
              >
            </li>
            <li>
              <button type="button" onclick={() => ws.download()} disabled={!ws.activeFile}
                ><Icon name="download" />Download file</button
              >
            </li>
            <li>
              <button type="button" onclick={() => ws.importFiles()}
                ><Icon name="upload" />Import files</button
              >
            </li>
            {#if app.installAvailable}<li>
                <button type="button" onclick={() => app.install()}
                  ><Icon name="install" />Install Asm8</button
                >
              </li>{/if}
            <li>
              <button type="button" onclick={() => (ui.overlay = { kind: 'about' })}
                ><Icon name="info" />About</button
              >
            </li>
          </ul>
        {:else}
          <button type="button" class="back" onclick={() => (more = 'menu')}
            ><Icon name="chevronRight" /> Back</button
          >
          {#if more === 'problems'}<ProblemsView />{:else if more === 'debug'}<DebugView
            />{:else if more === 'search'}<SearchView />{:else}<ReferenceView />{/if}
        {/if}
      </div>
    {/if}
  </main>

  {#if ui.phoneRegion === 'code' && editing}
    <div class="accessory" role="toolbar" aria-label="Insert">
      {#each ACCESSORY as k (k)}
        <button
          type="button"
          class="mono"
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => accessory(k)}>{k}</button
        >
      {/each}
    </div>
  {:else if s.state === 'paused' || (s.state === 'waiting' && ui.phoneRegion !== 'console')}
    <div class="stepbar" role="toolbar" aria-label="Step controls">
      <Button size="lg" icon="step" onclick={() => app.step()}>Step</Button>
      <Button size="lg" icon="stepOver" onclick={() => app.step('stepOver')}>Over</Button>
      <Button size="lg" icon="stepOut" onclick={() => app.step('stepOut')}>Out</Button>
      <Button size="lg" icon="stop" onclick={() => s.stop()}>Stop</Button>
    </div>
  {:else if s.state === 'waiting' && ui.phoneRegion === 'console'}
    <div class="keysbar"><Icon name="keyboard" /> Keys go to the program as you type</div>
  {:else if firstError && ui.phoneRegion === 'code'}
    <div class="problem" role="alert">
      <Icon name="error" />
      <button type="button" class="msg" onclick={() => app.editor?.gotoLine(firstError.line)}
        >Line {firstError.line + 1}: {firstError.message}</button
      >
      {#if firstError.fix}<Button size="lg" variant="primary" onclick={applyFix}
          >Fix: {firstError.fix.replacement}</Button
        >{/if}
    </div>
  {:else if s.state === 'fault'}
    <div class="problem" role="alert">
      <Icon name="error" />
      <span class="msg"
        >{s.snapshot?.fault} at 0x{hex(s.snapshot?.faultAddress ?? s.snapshot?.registers.ip ?? 0)}</span
      >
      <Button size="lg" onclick={() => app.reset()}>Reset</Button>
    </div>
  {/if}

  <nav class="bottom" aria-label="Sections">
    {#each NAV as n (n.id)}
      <button
        type="button"
        aria-current={ui.phoneRegion === n.id ? 'page' : undefined}
        onclick={() => go(n.id)}
      >
        <Icon name={n.icon} size={20} />
        <span>{n.label}</span>
      </button>
    {/each}
  </nav>

  {#if ui.lineSheet !== null}
    {@const line = ui.lineSheet}
    <div class="scrim" role="presentation" onclick={() => (ui.lineSheet = null)}></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Line {line + 1} actions">
      <p class="sheet-title mono">
        Line {line + 1} · {(ws.activeFile?.text.split('\n')[line] ?? '').split(';')[0]?.trim()}
      </p>
      <button type="button" onclick={() => (app.toggleBreakpoint(line), (ui.lineSheet = null))}>
        {s.breakpointsFor(ws.activeFile?.key ?? '').some((b) => b.line === line)
          ? 'Remove breakpoint'
          : 'Add breakpoint'}
      </button>
      <button
        type="button"
        onclick={() => {
          const path = ws.activeFile?.key;
          if (path) {
            if (!s.breakpointsFor(path).some((b) => b.line === line)) s.toggleBreakpoint(path, line);
            ui.phoneRegion = 'more';
            more = 'debug';
          }
          ui.lineSheet = null;
        }}>Breakpoint with condition…</button
      >
      <button
        type="button"
        onclick={() => {
          const path = ws.activeFile?.key;
          ui.lineSheet = null;
          if (!path) return;
          const had = s.breakpointsFor(path).some((b) => b.line === line);
          if (!had) s.toggleBreakpoint(path, line);
          app.run();
          if (!had) {
            // One-shot: remove it again once the run stops there.
            const stop = $effect.root(() => {
              $effect(() => {
                if (s.state === 'paused' || s.state === 'halted' || s.state === 'fault') {
                  if (s.breakpointsFor(path).some((b) => b.line === line)) s.toggleBreakpoint(path, line);
                  stop();
                }
              });
            });
          }
        }}>Run to this line</button
      >
      <button
        type="button"
        onclick={() => {
          void navigator.clipboard?.writeText(ws.activeFile?.text.split('\n')[line] ?? '');
          ui.lineSheet = null;
          ui.toast('Line copied');
        }}>Copy line</button
      >
      <Button size="lg" block onclick={() => (ui.lineSheet = null)}>Cancel</Button>
    </div>
  {/if}
</div>

<style>
  .phone {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    padding-top: env(safe-area-inset-top);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px 10px 16px;
    background: var(--color-ground);
    border-bottom: 1px solid var(--color-border);
  }
  .who {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .who strong {
    font-size: 15px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .state {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-muted);
    flex: none;
  }
  .running .dot {
    background: var(--color-positive);
  }
  .paused .dot {
    background: var(--color-warning);
  }
  .waiting .dot {
    background: var(--color-accent);
  }
  .fault .dot {
    background: var(--color-negative);
  }
  .region {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .region > :global(*) {
    height: 100%;
  }
  .more {
    height: 100%;
    overflow-y: auto;
  }
  .more ul {
    list-style: none;
    margin: 0;
    padding: 8px 0;
  }
  .more li button {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 48px;
    padding: 0 20px;
    font-size: 15px;
    text-align: left;
  }
  .more li button span {
    margin-left: auto;
    color: var(--color-muted);
    font-family: var(--font-mono);
  }
  .back {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 16px;
    color: var(--color-muted);
  }
  .back :global(.icon) {
    transform: rotate(180deg);
  }
  .accessory {
    display: flex;
    gap: 6px;
    padding: 6px 8px;
    overflow-x: auto;
    background: var(--color-raised);
    border-top: 1px solid var(--color-rule);
  }
  .accessory button {
    flex: none;
    min-width: 40px;
    height: 40px;
    padding: 0 10px;
    border-radius: 6px;
    background: var(--color-control);
    font-size: 13px;
  }
  .stepbar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 8px 12px;
    background: var(--color-raised);
    border-top: 1px solid var(--color-rule);
  }
  .stepbar :global(.btn) {
    padding: 0 8px;
  }
  .keysbar,
  .problem {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 6px 12px 6px 16px;
    background: var(--color-raised);
    border-top: 1px solid var(--color-rule);
  }
  .keysbar :global(.icon) {
    color: var(--color-accent);
  }
  .problem {
    background: var(--tint-error);
  }
  .problem :global(.icon) {
    color: var(--color-negative);
  }
  .msg {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-size: 13px;
  }
  .bottom {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-ground);
    border-top: 1px solid var(--color-border);
  }
  .bottom button {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 56px;
    color: var(--color-muted);
    font-size: 11px;
  }
  .bottom button[aria-current='page'] {
    color: var(--color-text);
  }
  .bottom button[aria-current='page']::before {
    content: '';
    position: absolute;
    top: 0;
    left: 25%;
    right: 25%;
    height: 1px;
    background: var(--color-accent);
  }
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgb(0 0 0 / 0.5);
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 31;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
    border-radius: 14px 14px 0 0;
    background: var(--color-raised);
  }
  @media (prefers-reduced-motion: no-preference) {
    .sheet {
      animation: up 200ms var(--ease-out);
    }
  }
  @keyframes up {
    from {
      transform: translateY(100%);
    }
  }
  .sheet-title {
    margin: 4px 8px 8px;
    color: var(--color-muted);
    font-size: 12px;
  }
  .sheet > button {
    min-height: 48px;
    padding: 0 12px;
    border-radius: 8px;
    text-align: left;
    font-size: 15px;
  }
  .sheet > button:hover {
    background: var(--color-control);
  }
  .sheet > :global(.btn) {
    margin-top: 8px;
  }
</style>
