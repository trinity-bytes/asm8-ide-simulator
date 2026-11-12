<script lang="ts">
  import { AppController } from '../state/app.svelte';
  import DebugView from '../organisms/side/DebugView.svelte';
  import ExplorerView from '../organisms/side/ExplorerView.svelte';
  import ReferenceView from '../organisms/side/ReferenceView.svelte';
  import SearchView from '../organisms/side/SearchView.svelte';

  interface Props {
    touch?: boolean;
    onopened?: () => void;
  }
  let { touch = false, onopened }: Props = $props();
  const app = AppController.use();
</script>

<aside class="side">
  {#if app.ui.sideView === 'explorer' || touch}
    <ExplorerView {touch} {onopened} />
  {:else if app.ui.sideView === 'search'}
    <SearchView />
  {:else if app.ui.sideView === 'debug'}
    <DebugView />
  {:else if app.ui.sideView === 'reference'}
    <ReferenceView />
  {/if}
</aside>

<style>
  .side {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--color-ground);
    border-right: 1px solid var(--color-border);
  }
  .side > :global(*) {
    flex: 1;
  }
</style>
