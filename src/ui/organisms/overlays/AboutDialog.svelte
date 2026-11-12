<script lang="ts">
  import Button from '../../atoms/Button.svelte';
  import Dialog from '../../molecules/Dialog.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const close = () => (app.ui.overlay = null);
</script>

<Dialog title="About Asm8" onclose={close}>
  <p class="v mono">Version {__APP_VERSION__}</p>
  <p>
    An 8-bit CPU simulator and assembly IDE. Based on Simple 8-bit Assembler Simulator by Marco Schweighauser
    (MIT).
  </p>
  <ul>
    <li>
      {app.ui.online ? 'Online' : 'Offline'} · {app.installed ? 'installed app' : 'running in the browser'}
    </li>
    <li>Works offline after the first visit.</li>
    <li>
      Files: {app.workspace.provider.canOpenFolders
        ? 'folders on your disk or the browser workspace'
        : 'browser workspace (this browser cannot open folders)'}.
    </li>
  </ul>
  {#snippet actions()}
    {#if app.installAvailable}<Button onclick={() => app.install()}>Install</Button>{/if}
    <Button variant="primary" onclick={close}>Close</Button>
  {/snippet}
</Dialog>

<style>
  p,
  li {
    line-height: 1.5;
  }
  .v {
    color: var(--color-text);
  }
  ul {
    padding-left: 18px;
  }
</style>
