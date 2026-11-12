<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  interface Props extends HTMLInputAttributes {
    value: string;
    label: string;
    icon?: IconName;
    invalid?: boolean;
    mono?: boolean;
    element?: HTMLInputElement | null;
  }
  let {
    value = $bindable(),
    label,
    icon,
    invalid = false,
    mono = false,
    element = $bindable(null),
    ...rest
  }: Props = $props();
</script>

<span class="field" class:invalid class:has-icon={icon}>
  {#if icon}<Icon name={icon} size={16} />{/if}
  <input
    bind:this={element}
    bind:value
    aria-label={label}
    aria-invalid={invalid || undefined}
    class:mono
    spellcheck="false"
    autocomplete="off"
    {...rest}
  />
</span>

<style>
  .field {
    position: relative;
    display: flex;
    align-items: center;
    color: var(--color-muted);
  }
  .field :global(.icon) {
    position: absolute;
    left: 10px;
    pointer-events: none;
  }
  input {
    width: 100%;
    height: 30px;
    padding: 0 10px;
    border-radius: var(--radius);
    border: 1px solid var(--color-control);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .has-icon input {
    padding-left: 34px;
  }
  input::placeholder {
    color: var(--color-muted);
  }
  input:focus-visible {
    border-color: var(--color-accent);
    box-shadow: none;
  }
  .invalid input {
    border-color: var(--color-negative);
  }
  .mono {
    font-family: var(--font-mono);
    font-size: 12px;
  }
</style>
