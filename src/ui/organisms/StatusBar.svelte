<script lang="ts">
  import { hex, MEMORY_SIZE, DISPLAY_SIZE } from '@core/index';
  import { AppController } from '../state/app.svelte';

  const app = AppController.use();
  const s = app.session;

  const where = $derived.by(() => {
    const snap = s.snapshot;
    if (!snap) return app.workspace.fs ? 'Ready' : 'No folder open';
    const ip = `0x${hex(snap.registers.ip)}`;
    switch (s.state) {
      case 'running':
        return `Running · step ${snap.steps}`;
      case 'waiting':
        return 'Waiting for a key · port 0x00';
      case 'paused':
        return `Paused at ${ip} · step ${snap.steps}`;
      case 'halted':
        return `Halted at ${ip}`;
      case 'fault':
        return `Error at ${ip}`;
      default:
        return 'Ready';
    }
  });
  const problems = $derived(
    app.activeAssembly?.diagnostics.filter((d) => d.severity === 'error').length ?? 0,
  );
  const warnings = $derived(
    app.activeAssembly?.diagnostics.filter((d) => d.severity === 'warning').length ?? 0,
  );
  const bytes = $derived(app.activeAssembly?.code.length ?? 0);
  const saveState = $derived.by(() => {
    const tab = app.workspace.activeFile;
    if (!tab) return app.workspace.active?.kind === 'settings' ? 'Settings saved automatically' : '';
    if (app.workspace.isDirty(tab)) return 'Unsaved changes';
    return app.workspace.fs?.kind === 'folder'
      ? 'Saved to disk'
      : app.workspace.fs?.kind === 'browser'
        ? 'Saved in browser'
        : 'Example';
  });
</script>

<footer class="status">
  <span>{where}</span>
  <button type="button" class="link" onclick={() => (app.ui.panelTab = 'problems')}>
    {problems} problem{problems === 1 ? '' : 's'}{warnings
      ? ` · ${warnings} warning${warnings === 1 ? '' : 's'}`
      : ''}
  </button>
  {#if app.workspace.activeFile}
    <span class:over={bytes > MEMORY_SIZE - DISPLAY_SIZE}>{bytes} of {MEMORY_SIZE} bytes used</span>
  {/if}
  {#if !app.ui.online}<span>Offline</span>{/if}
  <span class="spacer"></span>
  {#if app.workspace.activeFile}
    <span>Ln {app.cursor.line}, Col {app.cursor.col}</span>
    <span>Tab size {app.settings.value.tabSize}</span>
  {/if}
  {#if saveState}<span>{saveState}</span>{/if}
  <span>Asm8 · 8-bit CPU</span>
</footer>

<style>
  .status {
    display: flex;
    align-items: center;
    gap: 16px;
    height: var(--statusbar-h);
    padding: 0 12px;
    background: var(--color-ground);
    border-top: 1px solid var(--color-border);
    color: var(--color-muted);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
  }
  .spacer {
    flex: 1;
  }
  .link:hover {
    color: var(--color-text);
  }
  .over {
    color: var(--color-warning);
  }
</style>
