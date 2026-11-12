<script lang="ts">
  import Icon from '../atoms/Icon.svelte';
  import IconButton from '../atoms/IconButton.svelte';
  import Pill from '../atoms/Pill.svelte';
  import { AppController } from '../state/app.svelte';
  import RunControls from './RunControls.svelte';

  interface Props {
    touch?: boolean;
    onmenu?: () => void;
  }
  let { touch = false, onmenu }: Props = $props();
  const app = AppController.use();
  const ws = app.workspace;

  const crumbs = $derived.by(() => {
    const tab = ws.active;
    if (!tab) return ws.fs ? [ws.fs.name] : ['Welcome'];
    if (tab.kind !== 'file') return [tab.title];
    const parts = tab.key.split('/');
    // Touch layouts have room for the file name only.
    return touch ? [parts[parts.length - 1]!] : [ws.fs?.name ?? '', ...parts].filter(Boolean);
  });
  const steps = $derived(app.session.snapshot?.steps ?? 0);
</script>

<header class="titlebar" class:touch>
  {#if onmenu}
    <IconButton icon="menu" label="Files" size="touch" onclick={onmenu} />
  {/if}
  <div class="brand">
    <Icon name="cpu" size={20} />
    {#if !touch}<span>Asm8</span>{/if}
  </div>
  <nav class="crumbs" aria-label="Location">
    {#each crumbs as c, i (i)}
      {#if i > 0}<span class="sep" aria-hidden="true">/</span>{/if}
      <span class:last={i === crumbs.length - 1}>{c}</span>
    {/each}
  </nav>
  <div class="center"><RunControls {touch} /></div>
  <div class="state">
    <Pill state={app.session.state} />
    {#if steps > 0 && !touch}<span class="steps mono">{steps} steps</span>{/if}
  </div>
</header>

<style>
  .titlebar {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto minmax(0, 1fr) auto;
    grid-template-areas: 'menu brand crumbs center . state';
    align-items: center;
    gap: 12px;
    height: var(--titlebar-h);
    padding: 0 16px;
    background: var(--color-ground);
    border-bottom: 1px solid var(--color-border);
  }
  .titlebar > :global(:first-child:not(.brand)) {
    grid-area: menu;
  }
  .touch {
    height: 56px;
  }
  .brand {
    grid-area: brand;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-accent);
  }
  .brand span {
    color: var(--color-text);
    font-weight: 600;
    font-size: 14px;
  }
  .crumbs {
    grid-area: crumbs;
    display: flex;
    gap: 6px;
    min-width: 0;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
  }
  .crumbs span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .crumbs .last {
    color: var(--color-text);
  }
  .center {
    grid-area: center;
  }
  .state {
    grid-area: state;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-self: end;
  }
  .steps {
    color: var(--color-muted);
    font-size: 12px;
  }
</style>
