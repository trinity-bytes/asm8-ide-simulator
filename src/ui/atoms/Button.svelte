<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  interface Props extends HTMLButtonAttributes {
    /** primary: white pill (one per area). secondary: outlined. ghost: text only. danger: destructive. */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: IconName;
    block?: boolean;
    children?: Snippet;
  }
  let {
    variant = 'secondary',
    size = 'md',
    icon,
    block = false,
    children,
    type = 'button',
    ...rest
  }: Props = $props();
</script>

<button {type} class="btn {variant} {size}" class:block {...rest}>
  {#if icon}<Icon name={icon} size={size === 'lg' ? 18 : 16} />{/if}
  {#if children}<span class="label">{@render children()}</span>{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 30px;
    padding: 0 14px;
    border-radius: 999px;
    font-weight: 500;
    font-size: 13px;
    white-space: nowrap;
    border: 1px solid transparent;
    transition:
      background-color 120ms var(--ease-out),
      border-color 120ms var(--ease-out),
      transform 120ms var(--ease-out);
  }
  .btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .sm {
    height: 24px;
    padding: 0 10px;
    font-size: 12px;
  }
  .lg {
    height: 40px;
    padding: 0 18px;
    font-size: 14px;
  }
  .block {
    width: 100%;
  }
  .primary {
    background: var(--color-text);
    color: var(--color-surface);
  }
  .primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-text) 86%, var(--color-surface));
  }
  .secondary {
    border-color: var(--color-control);
    color: var(--color-text);
  }
  .secondary:hover:not(:disabled) {
    background: var(--color-raised);
  }
  .ghost {
    color: var(--color-text);
    padding: 0 8px;
  }
  .ghost:hover:not(:disabled) {
    background: var(--color-raised);
  }
  .danger {
    background: var(--color-negative);
    color: var(--color-surface);
  }
  .danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-negative) 85%, var(--color-text));
  }
  .btn:disabled {
    opacity: 0.45;
  }
  .btn:focus-visible {
    border-radius: 999px;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
