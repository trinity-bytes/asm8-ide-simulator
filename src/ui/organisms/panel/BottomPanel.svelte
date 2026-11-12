<script lang="ts">
  import ToggleChip from '../../atoms/ToggleChip.svelte';
  import TabStrip from '../../molecules/TabStrip.svelte';
  import { AppController } from '../../state/app.svelte';
  import type { PanelTab } from '../../state/ui.svelte';
  import MachinePanel from '../MachinePanel.svelte';
  import ConsoleView from './ConsoleView.svelte';
  import DisplayView from './DisplayView.svelte';
  import ProblemsView from './ProblemsView.svelte';
  import WritesView from './WritesView.svelte';

  interface Props {
    /** Tablet portrait puts the Machine panel here as a tab. */
    withMachine?: boolean;
    touch?: boolean;
  }
  let { withMachine = false, touch = false }: Props = $props();
  const app = AppController.use();
  const ui = app.ui;
  const settings = app.settings;
  const problems = $derived(app.activeAssembly?.diagnostics.length ?? 0);

  const tabs = $derived([
    { id: 'console' as PanelTab, label: 'Console' },
    ...(withMachine ? [{ id: 'machine' as PanelTab, label: 'Machine' }] : []),
    { id: 'problems' as PanelTab, label: 'Problems', badge: problems },
    { id: 'display' as PanelTab, label: 'Display' },
    ...(withMachine ? [] : [{ id: 'writes' as PanelTab, label: 'Memory writes' }]),
  ]);
  const current = $derived(tabs.some((t) => t.id === ui.panelTab) ? ui.panelTab : 'console');
</script>

<section class="panel" aria-label="Panel">
  <div class="bar">
    <TabStrip {tabs} active={current} label="Panel views" {touch} onselect={(id) => (ui.panelTab = id)} />
    {#if current === 'console'}
      <div class="tools">
        <ToggleChip
          pressed={settings.value.consoleView === 'text'}
          onclick={() => settings.set('consoleView', 'text')}>Text</ToggleChip
        >
        <ToggleChip
          pressed={settings.value.consoleView === 'hex'}
          onclick={() => settings.set('consoleView', 'hex')}>Hex</ToggleChip
        >
        <ToggleChip
          pressed={settings.value.consoleWrap}
          onclick={() => settings.set('consoleWrap', !settings.value.consoleWrap)}>Wrap</ToggleChip
        >
        <ToggleChip
          pressed={false}
          disabled={app.session.console.length === 0}
          onclick={() => app.session.clearConsole()}>Clear</ToggleChip
        >
      </div>
    {/if}
  </div>
  <div class="body" id="ppanel-{current}" role="tabpanel" aria-labelledby="ptab-{current}">
    {#if current === 'console'}
      <ConsoleView {touch} />
    {:else if current === 'problems'}
      <ProblemsView />
    {:else if current === 'display'}
      <DisplayView />
    {:else if current === 'writes'}
      <WritesView />
    {:else if current === 'machine'}
      <MachinePanel embedded />
    {/if}
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: var(--tab-h);
    padding: 0 12px 0 16px;
    flex: none;
  }
  .tools {
    display: flex;
    gap: 6px;
  }
  .body {
    flex: 1;
    min-height: 0;
  }
</style>
