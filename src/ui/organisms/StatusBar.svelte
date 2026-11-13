<script lang="ts">
  import { hex, MEMORY_SIZE, DISPLAY_SIZE } from '@core/index';
  import { t, tn } from '../i18n/i18n.svelte';
  import { AppController } from '../state/app.svelte';

  const app = AppController.use();
  const s = app.session;

  const where = $derived.by(() => {
    const snap = s.snapshot;
    if (!snap) return app.workspace.fs ? t('shell.state.ready') : t('shell.status.noFolder');
    const ip = `0x${hex(snap.registers.ip)}`;
    switch (s.state) {
      case 'running':
        return t('shell.state.runningStep', { n: snap.steps });
      case 'waiting':
        return t('shell.state.waitingKey');
      case 'paused':
        return t('shell.status.pausedAt', { ip, n: snap.steps });
      case 'halted':
        return t('shell.status.haltedAt', { ip });
      case 'fault':
        return t('shell.status.errorAt', { ip });
      default:
        return t('shell.state.ready');
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
    if (!tab) return app.workspace.active?.kind === 'settings' ? t('shell.status.settingsSaved') : '';
    if (app.workspace.isDirty(tab)) return t('shell.status.unsaved');
    return app.workspace.fs?.kind === 'folder'
      ? t('shell.status.savedDisk')
      : app.workspace.fs?.kind === 'browser'
        ? t('shell.status.savedBrowser')
        : t('shell.status.example');
  });
</script>

<footer class="status">
  <span>{where}</span>
  <button type="button" class="link" onclick={() => (app.ui.panelTab = 'problems')}>
    {tn('shell.status.problems', problems)}{warnings ? tn('shell.status.warnings', warnings) : ''}
  </button>
  {#if app.workspace.activeFile}
    <span class:over={bytes > MEMORY_SIZE - DISPLAY_SIZE}
      >{t('shell.status.bytesUsed', { bytes, total: MEMORY_SIZE })}</span
    >
  {/if}
  {#if !app.ui.online}<span>{t('shell.status.offline')}</span>{/if}
  <span class="spacer"></span>
  {#if app.workspace.activeFile}
    <span>{t('shell.status.cursor', { line: app.cursor.line, col: app.cursor.col })}</span>
    <span>{t('shell.status.tabSize', { n: app.settings.value.tabSize })}</span>
  {/if}
  {#if saveState}<span>{saveState}</span>{/if}
  <span>{t('shell.status.product')}</span>
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
