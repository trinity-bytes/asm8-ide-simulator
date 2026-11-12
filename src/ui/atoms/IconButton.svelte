<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  interface Props extends HTMLButtonAttributes {
    icon: IconName;
    /** Required: icon-only buttons need an accessible name (also shown as a tooltip). */
    label: string;
    size?: 'sm' | 'md' | 'touch';
    active?: boolean;
    tone?: 'default' | 'positive' | 'negative' | 'warning';
  }
  let {
    icon,
    label,
    size = 'md',
    active = false,
    tone = 'default',
    type = 'button',
    ...rest
  }: Props = $props();
</script>

<button {type} class="ib {size} {tone}" class:active aria-label={label} title={label} {...rest}>
  <Icon name={icon} size={size === 'sm' ? 14 : size === 'touch' ? 20 : 16} />
</button>

<style>
  .ib {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius);
    color: var(--color-muted);
    flex: none;
  }
  .sm {
    width: 22px;
    height: 22px;
  }
  .touch {
    width: 40px;
    height: 40px;
  }
  .ib:hover:not(:disabled),
  .active {
    color: var(--color-text);
    background: var(--color-raised);
  }
  .positive {
    color: var(--color-positive);
  }
  .negative {
    color: var(--color-negative);
  }
  .warning {
    color: var(--color-warning);
  }
  .ib:disabled {
    opacity: 0.4;
  }
</style>
