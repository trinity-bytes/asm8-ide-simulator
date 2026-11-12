<script lang="ts">
  import Menu from '../../molecules/Menu.svelte';
  import { AppController } from '../../state/app.svelte';
  import AboutDialog from './AboutDialog.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import ConfirmHost from './ConfirmHost.svelte';
  import ShortcutsSheet from './ShortcutsSheet.svelte';
  import ThemePicker from './ThemePicker.svelte';
  import Toaster from './Toaster.svelte';

  const app = AppController.use();
  const ui = app.ui;
</script>

{#if ui.overlay?.kind === 'palette'}
  {#key ui.overlay.mode}<CommandPalette mode={ui.overlay.mode} />{/key}
{:else if ui.overlay?.kind === 'shortcuts'}
  <ShortcutsSheet />
{:else if ui.overlay?.kind === 'themes'}
  <ThemePicker />
{:else if ui.overlay?.kind === 'about'}
  <AboutDialog />
{/if}

{#if ui.contextMenu}
  <Menu
    items={ui.contextMenu.items}
    x={ui.contextMenu.x}
    y={ui.contextMenu.y}
    onclose={() => (ui.contextMenu = null)}
  />
{/if}

<ConfirmHost />
<Toaster />
