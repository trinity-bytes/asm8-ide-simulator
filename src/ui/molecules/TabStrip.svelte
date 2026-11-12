<script lang="ts" generics="T extends string">
  interface Props {
    tabs: readonly { id: T; label: string; badge?: number }[];
    active: T;
    label: string;
    onselect: (id: T) => void;
    touch?: boolean;
  }
  let { tabs, active, label, onselect, touch = false }: Props = $props();

  function onkeydown(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length]!;
    onselect(next.id);
    (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus();
  }
</script>

<div class="strip" class:touch role="tablist" aria-label={label} tabindex="-1" {onkeydown}>
  {#each tabs as t (t.id)}
    <button
      type="button"
      role="tab"
      data-id={t.id}
      id="ptab-{t.id}"
      aria-selected={t.id === active}
      aria-controls="ppanel-{t.id}"
      tabindex={t.id === active ? 0 : -1}
      onclick={() => onselect(t.id)}
    >
      {t.label}
      {#if t.badge !== undefined}<span class="badge mono">{t.badge}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: 20px;
    height: 100%;
  }
  button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-muted);
    font-size: 13px;
    white-space: nowrap;
  }
  button:hover,
  button[aria-selected='true'] {
    color: var(--color-text);
  }
  button[aria-selected='true']::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--color-accent);
  }
  .touch button {
    min-height: 44px;
  }
  .badge {
    min-width: 16px;
    padding: 0 4px;
    border-radius: 4px;
    background: var(--color-raised);
    font-size: 11px;
    text-align: center;
    color: var(--color-text);
  }
</style>
