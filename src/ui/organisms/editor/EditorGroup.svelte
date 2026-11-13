<script lang="ts">
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';
  import EditorTab from '../../molecules/EditorTab.svelte';
  import EditorPane from './EditorPane.svelte';
  import ReferencePage from './ReferencePage.svelte';
  import SettingsPage from './SettingsPage.svelte';
  import Welcome from './Welcome.svelte';

  interface Props {
    compact?: boolean;
    showTabs?: boolean;
  }
  let { compact = false, showTabs = true }: Props = $props();
  const app = AppController.use();
  const ws = app.workspace;
  let dragging: string | null = null;

  function tabMenu(id: string, e: MouseEvent) {
    e.preventDefault();
    const tab = ws.tabs.find((t) => t.id === id);
    app.ui.openMenu(e.clientX, e.clientY, [
      { label: t('common.close'), shortcut: 'Alt+W', run: () => void app.closeTab(id) },
      {
        label: t('editor.group.closeOthers'),
        disabled: ws.tabs.length < 2,
        run: () => void app.closeOthers(id),
      },
      ...(tab?.kind === 'file'
        ? [
            'separator' as const,
            {
              label: t('editor.group.reveal'),
              run: () => {
                app.ui.sideView = 'explorer';
                const parts = tab.key.split('/');
                for (let i = 1; i < parts.length; i++) ws.expanded[parts.slice(0, i).join('/')] = true;
              },
            },
            { label: t('editor.group.download'), run: () => ws.download(id) },
          ]
        : []),
    ]);
  }

  function onkeydown(e: KeyboardEvent) {
    const i = ws.tabs.findIndex((t) => t.id === ws.activeId);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step || i < 0) return;
    e.preventDefault();
    const next = ws.tabs[(i + step + ws.tabs.length) % ws.tabs.length]!;
    ws.activate(next.id);
    queueMicrotask(() => document.getElementById(`tab-${next.id}`)?.focus());
  }
</script>

<section class="group" aria-label={t('editor.group.label')}>
  {#if showTabs && ws.tabs.length}
    <div class="tabs" role="tablist" aria-label={t('editor.group.openFiles')} tabindex="-1" {onkeydown}>
      {#each ws.tabs as t, i (t.id)}
        <EditorTab
          id={t.id}
          title={t.title}
          active={t.id === ws.activeId}
          dirty={ws.isDirty(t)}
          onselect={() => ws.activate(t.id)}
          onclose={() => app.closeTab(t.id)}
          oncontextmenu={(e) => tabMenu(t.id, e)}
          ondragstart={() => (dragging = t.id)}
          ondrop={() => {
            if (dragging) ws.moveTab(dragging, i);
            dragging = null;
          }}
        />
      {/each}
    </div>
  {/if}
  <div class="content">
    {#if !ws.active}
      <Welcome />
    {:else if ws.active.kind === 'file'}
      <EditorPane tab={ws.active} {compact} />
    {:else if ws.active.kind === 'settings'}
      <SettingsPage />
    {:else}
      <ReferencePage mnemonic={ws.active.key} />
    {/if}
  </div>
</section>

<style>
  .group {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    height: 100%;
    background: var(--color-surface);
  }
  .tabs {
    display: flex;
    flex: none;
    height: var(--tab-h);
    background: var(--color-ground);
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .content {
    flex: 1;
    min-height: 0;
  }
</style>
