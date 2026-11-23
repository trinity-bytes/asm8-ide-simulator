<script lang="ts" generics="T extends string | number">
  import Icon from './Icon.svelte';

  type Option = { value: T; label: string };
  interface Props {
    value: T;
    /** Flat options; ignored when `groups` is given. */
    options?: readonly Option[];
    /** Options shown under a heading each (`<optgroup>`). */
    groups?: readonly { label: string; options: readonly Option[] }[];
    label: string;
    onchange: (value: T) => void;
    id?: string;
    disabled?: boolean;
  }
  let { value, options = [], groups, label, onchange, id, disabled = false }: Props = $props();
  const all = $derived(groups ? groups.flatMap((g) => g.options) : options);
</script>

<span class="select">
  <select
    {id}
    aria-label={label}
    {disabled}
    value={String(value)}
    onchange={(e) => {
      const raw = e.currentTarget.value;
      const hit = all.find((o) => String(o.value) === raw);
      if (hit) onchange(hit.value);
    }}
  >
    {#if groups}
      {#each groups as g (g.label)}
        <optgroup label={g.label}>
          {#each g.options as o (o.value)}
            <option value={String(o.value)}>{o.label}</option>
          {/each}
        </optgroup>
      {/each}
    {:else}
      {#each options as o (o.value)}
        <option value={String(o.value)}>{o.label}</option>
      {/each}
    {/if}
  </select>
  <Icon name="chevronDown" size={14} />
</span>

<style>
  .select {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 170px;
    color: var(--color-muted);
  }
  select {
    appearance: none;
    width: 100%;
    height: 30px;
    padding: 0 30px 0 10px;
    border-radius: var(--radius);
    border: 1px solid var(--color-control);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }
  select:hover {
    border-color: var(--color-muted);
  }
  select:focus-visible {
    border-color: var(--color-accent);
    box-shadow: none;
  }
  .select :global(.icon) {
    position: absolute;
    right: 10px;
    pointer-events: none;
  }
</style>
