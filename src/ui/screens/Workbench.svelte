<script lang="ts">
  import IconButton from '../atoms/IconButton.svelte';
  import Resizer from '../atoms/Resizer.svelte';
  import ActivityRail from '../organisms/ActivityRail.svelte';
  import EditorGroup from '../organisms/editor/EditorGroup.svelte';
  import MachinePanel from '../organisms/MachinePanel.svelte';
  import BottomPanel from '../organisms/panel/BottomPanel.svelte';
  import StatusBar from '../organisms/StatusBar.svelte';
  import TitleBar from '../organisms/TitleBar.svelte';
  import { t } from '../i18n/i18n.svelte';
  import { AppController } from '../state/app.svelte';
  import SideBar from './SideBar.svelte';

  /**
   * Desktop (rail + side bar + editor/panel + Machine) and tablet. Tablet landscape keeps the rail
   * and shows Machine as a drawer; tablet portrait drops the rail, opens files in a sheet and moves
   * Machine into the bottom tabs.
   */
  const app = AppController.use();
  const ui = app.ui;
  const layout = $derived(ui.layout);
  const touch = $derived(layout !== 'desktop');
  const portrait = $derived(layout === 'tablet-portrait');
  // Settings takes the full width (Figma "Settings"); files and references keep the Machine panel.
  const showMachine = $derived(
    layout === 'desktop' && app.workspace.active !== null && app.workspace.active.kind !== 'settings',
  );

  // Side bar, Machine panel and bottom panel are resizable (drag the edge), remembered per session.
  const SIDE = { initial: 248, min: 180, max: 480 };
  const MACHINE = { initial: 384, min: 340, max: 640 };
  const PANEL = { initial: 272, min: 120 };
  let sideWidth = $state(SIDE.initial);
  let machineWidth = $state(MACHINE.initial);
  let panelHeight = $state(PANEL.initial);
  let viewportHeight = $state(900);
  const panelMax = $derived(Math.max(PANEL.min, viewportHeight - 220));
</script>

<svelte:window bind:innerHeight={viewportHeight} />

<div class="wb {layout}">
  <TitleBar {touch} onmenu={portrait ? () => (ui.filesSheet = true) : undefined} />
  <div class="body">
    {#if !portrait}<ActivityRail />{/if}
    {#if !portrait && ui.sideView}
      <div class="side" style:width="{touch ? SIDE.initial : sideWidth}px"><SideBar {touch} /></div>
      {#if !touch}
        <Resizer
          axis="x"
          grow={1}
          size={sideWidth}
          {...SIDE}
          label={t('shell.wb.resizeSide')}
          onresize={(v) => (sideWidth = v)}
        />
      {/if}
    {/if}
    <main class="center" style:--panel-h="{portrait ? 420 : Math.min(panelHeight, panelMax)}px">
      <div class="editor"><EditorGroup /></div>
      <Resizer
        axis="y"
        grow={-1}
        size={Math.min(panelHeight, panelMax)}
        initial={PANEL.initial}
        min={PANEL.min}
        max={panelMax}
        label={t('shell.wb.resizePanel')}
        onresize={(v) => (panelHeight = v)}
      />
      <div class="panel"><BottomPanel withMachine={portrait} {touch} /></div>
    </main>
    {#if showMachine}
      <Resizer
        axis="x"
        grow={-1}
        size={machineWidth}
        {...MACHINE}
        label={t('shell.wb.resizeMachine')}
        onresize={(v) => (machineWidth = v)}
      />
      <div class="machine" style:width="{machineWidth}px"><MachinePanel /></div>
    {/if}
    {#if layout === 'tablet-landscape'}
      {#if ui.machineDrawer}
        <div class="drawer" role="complementary" aria-label={t('shell.wb.machineDrawer')}>
          <MachinePanel onclose={() => (ui.machineDrawer = false)} />
        </div>
      {:else}
        <button type="button" class="drawer-tab" onclick={() => (ui.machineDrawer = true)}
          >{t('shell.wb.machine')}</button
        >
      {/if}
    {/if}
  </div>
  <StatusBar />

  {#if portrait && ui.filesSheet}
    <div class="scrim" role="presentation" onclick={() => (ui.filesSheet = false)}></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label={t('shell.wb.files')}>
      <div class="sheet-head">
        <IconButton
          icon="close"
          label={t('shell.wb.closeFiles')}
          size="touch"
          onclick={() => (ui.filesSheet = false)}
        />
      </div>
      <SideBar touch onopened={() => (ui.filesSheet = false)} />
    </div>
  {/if}
</div>

<style>
  .wb {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-ground);
  }
  .body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .side {
    flex: none;
    min-height: 0;
  }
  .center {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-rows: minmax(120px, 1fr) 0 var(--panel-h);
  }
  .editor,
  .panel {
    min-height: 0;
  }
  .machine {
    flex: none;
    min-height: 0;
    border-left: 1px solid var(--color-border);
  }
  .drawer {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    width: 384px;
    border-left: 1px solid var(--color-border);
    box-shadow: -12px 0 32px rgb(0 0 0 / 0.35);
    display: flex;
    flex-direction: column;
    background: var(--color-ground);
  }
  .drawer-tab {
    position: absolute;
    right: 0;
    top: 50%;
    z-index: 5;
    padding: 12px 8px;
    writing-mode: vertical-rl;
    border-radius: 8px 0 0 8px;
    background: var(--color-raised);
    border: 1px solid var(--color-control);
    border-right: 0;
    font-weight: 500;
    min-width: 40px;
  }
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgb(0 0 0 / 0.5);
  }
  .sheet {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 31;
    width: min(360px, 85vw);
    display: flex;
    flex-direction: column;
    background: var(--color-ground);
    box-shadow: 12px 0 32px rgb(0 0 0 / 0.4);
  }
  @media (prefers-reduced-motion: no-preference) {
    .sheet {
      animation: slide 200ms var(--ease-out);
    }
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
  }
  .sheet-head {
    display: flex;
    justify-content: flex-end;
    padding: 8px;
  }
  .sheet > :global(.side) {
    flex: 1;
    border-right: 0;
  }
  .tablet-landscape,
  .tablet-portrait {
    --tab-h: 44px;
  }
</style>
