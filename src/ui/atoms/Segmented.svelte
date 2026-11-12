<script lang="ts" generics="T extends string">
  interface Props {
    value: T;
    options: readonly { value: T; label: string }[];
    label: string;
    onchange: (value: T) => void;
    /** `tabs` draws the accent underline instead of a pill (Machine panel header). */
    look?: 'pill' | 'tabs';
  }
  let { value, options, label, onchange, look = 'pill' }: Props = $props();

  function onkeydown(e: KeyboardEvent) {
    const i = options.findIndex((o) => o.value === value);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length]!;
    onchange(next.value);
    (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  }
</script>

<div class="seg {look}" role="radiogroup" aria-label={label} tabindex="-1" {onkeydown}>
  {#each options as o (o.value)}
    <button
      type="button"
      role="radio"
      data-value={o.value}
      aria-checked={o.value === value}
      tabindex={o.value === value ? 0 : -1}
      onclick={() => onchange(o.value)}>{o.label}</button
    >
  {/each}
</div>

<style>
  .seg {
    display: inline-flex;
    gap: 2px;
  }
  .pill {
    padding: 2px;
    border-radius: 999px;
    border: 1px solid var(--color-control);
  }
  .pill button {
    height: 24px;
    padding: 0 12px;
    border-radius: 999px;
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 500;
  }
  .pill button[aria-checked='true'] {
    background: var(--color-raised);
    color: var(--color-text);
  }
  .tabs {
    gap: 16px;
  }
  .tabs button {
    height: 22px;
    color: var(--color-muted);
    font-size: 12px;
    border-bottom: 1px solid transparent;
  }
  .tabs button[aria-checked='true'] {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
  }
  button:hover {
    color: var(--color-text);
  }
</style>
