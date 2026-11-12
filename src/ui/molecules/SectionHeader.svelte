<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    meta?: string;
    actions?: Snippet;
    id?: string;
  }
  let { title, meta, actions, id }: Props = $props();
</script>

<div class="head">
  <h3 {id}>{title}</h3>
  {#if meta}<span class="meta">{meta}</span>{/if}
  {#if actions}<span class="actions">{@render actions()}</span>{/if}
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    padding: 0 16px;
  }
  h3 {
    flex: 1;
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-muted);
    white-space: nowrap;
  }
  .meta {
    font-size: 12px;
    color: var(--color-muted);
  }
  .actions {
    display: flex;
    gap: 2px;
  }
</style>
