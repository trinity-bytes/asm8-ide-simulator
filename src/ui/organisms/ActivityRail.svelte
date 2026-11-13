<script lang="ts">
  import Icon from '../atoms/Icon.svelte';
  import type { IconName } from '../atoms/icons';
  import type { MessageKey } from '../i18n/i18n.svelte';
  import { t } from '../i18n/i18n.svelte';
  import { AppController } from '../state/app.svelte';
  import type { SideView } from '../state/ui.svelte';

  const app = AppController.use();
  const ui = app.ui;
  const VIEWS: { id: SideView; icon: IconName; label: MessageKey; cmd: string }[] = [
    { id: 'explorer', icon: 'explorer', label: 'shell.view.explorer', cmd: 'view.explorer' },
    { id: 'search', icon: 'search', label: 'shell.view.search', cmd: 'view.search' },
    { id: 'debug', icon: 'debug', label: 'shell.view.debug', cmd: 'view.debug' },
    { id: 'reference', icon: 'reference', label: 'shell.view.reference', cmd: 'view.reference' },
  ];
  const settingsActive = $derived(app.workspace.active?.kind === 'settings');
</script>

<nav class="rail" aria-label={t('shell.rail.label')}>
  {#each VIEWS as v (v.id)}
    {@const keys = app.keysFor(v.cmd)}
    {@const label = t(v.label)}
    <button
      type="button"
      class:active={ui.sideView === v.id}
      aria-pressed={ui.sideView === v.id}
      aria-label={label}
      title="{label}{keys ? ` (${keys})` : ''}"
      onclick={() => ui.toggleSideView(v.id)}
    >
      <Icon name={v.icon} size={20} />
    </button>
  {/each}
  <span class="spacer"></span>
  <button
    type="button"
    class:active={settingsActive}
    aria-label={t('shell.view.settings')}
    title="{t('shell.view.settings')} ({app.keysFor('pref.settings')})"
    onclick={() => app.openSettings()}
  >
    <Icon name="settings" size={20} />
  </button>
</nav>

<style>
  .rail {
    display: flex;
    flex-direction: column;
    width: var(--rail-w);
    padding: 4px 0 8px;
    background: var(--color-ground);
    border-right: 1px solid var(--color-border);
  }
  button {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 44px;
    color: var(--color-muted);
  }
  button:hover,
  .active {
    color: var(--color-text);
  }
  .active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 1px;
    background: var(--color-accent);
  }
  button:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .spacer {
    flex: 1;
  }
</style>
