<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconButton from '../atoms/IconButton.svelte';
  import { t } from '../i18n/i18n.svelte';

  interface Props {
    title: string;
    onclose: () => void;
    width?: number;
    children: Snippet;
    actions?: Snippet;
    /** Element to focus first (defaults to the first focusable inside the body). */
    initialFocus?: string;
  }
  let { title, onclose, width = 420, children, actions, initialFocus }: Props = $props();

  let dialog: HTMLDialogElement | null = $state(null);
  const id = `dlg-${Math.random().toString(36).slice(2, 8)}`;

  $effect(() => {
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const target = initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null;
    target?.focus();
    return () => opener?.focus?.();
  });
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  style:width="min({width}px, calc(100vw - 32px))"
  aria-labelledby="{id}-title"
  oncancel={(e) => {
    e.preventDefault();
    onclose();
  }}
  onclick={(e) => e.target === dialog && onclose()}
>
  <header>
    <h2 id="{id}-title">{title}</h2>
    <IconButton icon="close" label={t('common.close')} size="sm" onclick={onclose} />
  </header>
  <div class="body">{@render children()}</div>
  {#if actions}<footer>{@render actions()}</footer>{/if}
</dialog>

<style>
  .dialog {
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--color-raised);
    color: var(--color-text);
    box-shadow: var(--shadow-pop);
  }
  .dialog::backdrop {
    background: rgb(0 0 0 / 0.55);
  }
  @media (prefers-reduced-motion: no-preference) {
    .dialog[open] {
      animation: pop 160ms var(--ease-out);
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 0 18px;
  }
  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .body {
    padding: 8px 18px 0;
    color: var(--color-muted);
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 18px 16px;
  }
</style>
