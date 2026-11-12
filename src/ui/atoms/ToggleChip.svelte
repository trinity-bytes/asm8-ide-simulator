<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    pressed: boolean;
    onclick: () => void;
    disabled?: boolean;
    children: Snippet;
  }
  let { pressed, onclick, disabled = false, children }: Props = $props();
</script>

<button type="button" class="chip" aria-pressed={pressed} {onclick} {disabled}>{@render children()}</button>

<style>
  .chip {
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--color-control);
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 500;
  }
  .chip[aria-pressed='true'] {
    color: var(--color-text);
    border-color: var(--color-text);
  }
  .chip:hover:not(:disabled) {
    background: var(--color-raised);
  }
  .chip:focus-visible {
    border-radius: 999px;
  }
</style>
