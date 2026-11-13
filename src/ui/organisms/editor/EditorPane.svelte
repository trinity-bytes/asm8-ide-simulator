<script lang="ts">
  import { hex } from '@core/index';
  import Button from '../../atoms/Button.svelte';
  import Editor from '../../editor/Editor.svelte';
  import type { EditorData, RunMarker } from '../../editor/extensions';
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';
  import type { Tab } from '../../state/workspace.svelte';

  interface Props {
    tab: Tab;
    compact?: boolean;
  }
  let { tab, compact = false }: Props = $props();
  const app = AppController.use();
  const s = app.session;
  const settings = $derived(app.settings.value);

  const marker = $derived.by((): RunMarker | null => {
    const snap = s.snapshot;
    if (!snap || !s.program || s.program.path !== tab.key || snap.line === undefined) return null;
    if (s.program.source !== tab.text) return null;
    const step = t('editor.pane.step', { n: snap.steps });
    switch (s.state) {
      case 'paused': {
        const stop = s.lastStop;
        const hint =
          stop?.kind === 'breakpoint'
            ? t('editor.pane.pausedAtBreakpoint', { step })
            : t('editor.pane.paused', { step });
        return { line: snap.line, tone: 'paused', hint };
      }
      case 'waiting':
        return { line: snap.line, tone: 'paused', hint: t('editor.pane.waiting') };
      case 'fault':
        return settings.pauseOnFault
          ? {
              line: snap.line,
              tone: 'error',
              hint: t('editor.pane.faultHint', { fault: snap.fault ?? t('editor.pane.fault'), step }),
            }
          : null;
      case 'halted':
        return { line: snap.line, tone: 'halted', hint: t('editor.pane.halted', { n: snap.steps }) };
      case 'running':
        return s.speed === 'max' ? null : { line: snap.line, tone: 'running', hint: '' };
      default:
        return null;
    }
  });

  const data = $derived<EditorData>({
    assembly: app.activeAssembly,
    breakpoints: s.breakpointsFor(tab.key).map((b) => ({
      line: b.line,
      enabled: b.enabled !== false,
      conditional: !!b.condition,
    })),
    marker,
    registers:
      s.state === 'paused' || s.state === 'halted' || s.state === 'fault' || s.state === 'waiting'
        ? (s.snapshot?.registers ?? null)
        : null,
    base: settings.numberBase,
    showAddresses: settings.showAddresses && !compact,
    inlineHints: settings.inlineHints,
  });

  const readOnly = $derived(app.workspace.needsAccess);
</script>

<div class="pane">
  {#if tab.changedOnDisk}
    <div class="banner warn" role="alert">
      <span><strong>{tab.title}</strong> {t('editor.pane.changedOnDisk')}</span>
      <Button size="sm" disabled title={t('editor.pane.compareSoon')}>{t('editor.pane.compare')}</Button>
      <Button size="sm" onclick={() => app.workspace.keepMine(tab.id)}>{t('editor.pane.keepMine')}</Button>
      <Button size="sm" variant="primary" onclick={() => app.workspace.reload(tab.id)}
        >{t('editor.pane.loadFromDisk')}</Button
      >
    </div>
  {:else if readOnly}
    <div class="banner" role="status">
      <span
        >{t('editor.pane.readOnlyBefore')} <strong>{app.workspace.fs?.name}</strong>
        {t('editor.pane.readOnlyAfter')}</span
      >
      <Button size="sm" variant="primary" onclick={() => app.workspace.allowAccess()}
        >{t('editor.pane.allowAgain')}</Button
      >
    </div>
  {:else if app.workspace.fs?.kind === 'browser' && !app.workspace.provider.canOpenFolders}
    <div class="banner" role="status">
      <span>{t('editor.pane.noFolders')}</span>
    </div>
  {/if}
  {#if s.state === 'fault' && s.program?.path === tab.key && s.snapshot?.fault && settings.pauseOnFault}
    <div class="banner error" role="alert">
      <span
        >{t('editor.pane.faultAt', {
          fault: s.snapshot.fault,
          addr: hex(s.snapshot.faultAddress ?? s.snapshot.registers.ip),
        })}{s.snapshot.line !== undefined ? t('editor.pane.faultLine', { line: s.snapshot.line + 1 }) : ''}{t(
          'editor.pane.faultEnd',
        )}</span
      >
      <Button size="sm" onclick={() => app.reset()}>{t('common.reset')}</Button>
    </div>
  {/if}
  <div class="host">
    <Editor
      tabId={tab.id}
      text={tab.text}
      {data}
      {compact}
      {readOnly}
      tabSize={compact ? Math.min(settings.tabSize, 4) : settings.tabSize}
      label={t('editor.pane.sourceCode', { title: tab.title })}
      onchange={(t) => app.workspace.updateText(tab.id, t)}
      ontogglebreakpoint={(line) => s.toggleBreakpoint(tab.key, line)}
      onbreakpointsmoved={(lines) => {
        const old = s.breakpointsFor(tab.key);
        s.setBreakpoints(
          tab.key,
          lines.map((line, i) => ({ ...old[i], line })),
        );
      }}
      onreference={(m) => app.openReference(m)}
      oncursor={(line, col) => (app.cursor = { line, col })}
      onready={(b) => (app.editor = b)}
      onlinelongpress={(line) => (app.ui.lineSheet = line)}
    />
  </div>
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .host {
    flex: 1;
    min-height: 0;
  }
  .banner {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 16px;
    background: var(--color-raised);
    border-bottom: 1px solid var(--color-rule);
    font-size: 13px;
  }
  .banner span {
    flex: 1;
    min-width: 200px;
  }
  .banner strong {
    font-weight: 600;
  }
  .warn {
    box-shadow: inset 2px 0 var(--color-warning);
  }
  .error {
    background: var(--tint-error);
    box-shadow: inset 2px 0 var(--color-negative);
  }
</style>
