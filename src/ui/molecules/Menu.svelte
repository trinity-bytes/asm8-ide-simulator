<script lang="ts">
  import type { MenuItemSpec } from '../state/ui.svelte';
  import Icon from '../atoms/Icon.svelte';
  import Kbd from '../atoms/Kbd.svelte';
  import { t } from '../i18n/i18n.svelte';

  interface Props {
    items: readonly (MenuItemSpec | 'separator')[];
    x: number;
    y: number;
    onclose: () => void;
    label?: string;
  }
  let { items, x, y, onclose, label }: Props = $props();

  let menu: HTMLDivElement | null = $state(null);
  let pos = $state({ left: 0, top: 0 });

  $effect(() => {
    if (!menu) return;
    const r = menu.getBoundingClientRect();
    pos = {
      left: Math.max(8, Math.min(x, innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, innerHeight - r.height - 8)),
    };
    menu.querySelector<HTMLElement>('[role^=menuitem]:not([disabled])')?.focus();
    const away = (e: PointerEvent) => !menu?.contains(e.target as Node) && onclose();
    const t = setTimeout(() => addEventListener('pointerdown', away), 0);
    return () => {
      clearTimeout(t);
      removeEventListener('pointerdown', away);
    };
  });

  function onkeydown(e: KeyboardEvent) {
    const all = [...(menu?.querySelectorAll<HTMLElement>('[role^=menuitem]:not([disabled])') ?? [])];
    const i = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onclose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus();
    }
  }
</script>

<div
  bind:this={menu}
  class="menu"
  role="menu"
  tabindex="-1"
  aria-label={label ?? t('shell.menu.actions')}
  style:left="{pos.left}px"
  style:top="{pos.top}px"
  {onkeydown}
>
  {#each items as item, i (i)}
    {#if item === 'separator'}
      <div class="sep" role="separator"></div>
    {:else}
      <button
        type="button"
        role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
        aria-checked={item.checked}
        class:danger={item.danger}
        disabled={item.disabled}
        onclick={() => {
          onclose();
          item.run();
        }}
      >
        <span class="label">
          {#if item.checked !== undefined}<span class="check"
              >{#if item.checked}<Icon name="check" size={14} />{/if}</span
            >{/if}
          {item.label}
        </span>
        {#if item.shortcut}<Kbd keys={item.shortcut} />{/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .menu {
    position: fixed;
    z-index: 60;
    min-width: 220px;
    padding: 4px;
    border-radius: 8px;
    background: var(--color-raised);
    box-shadow: var(--shadow-pop);
  }
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    width: 100%;
    height: 30px;
    padding: 0 10px;
    border-radius: 5px;
    text-align: left;
    color: var(--color-text);
  }
  button:hover:not(:disabled),
  button:focus-visible {
    background: var(--color-control);
    box-shadow: none;
  }
  button:hover :global(kbd),
  button:focus-visible :global(kbd) {
    color: var(--color-text);
  }
  button:disabled {
    color: var(--color-muted);
    opacity: 0.6;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .check {
    display: inline-grid;
    width: 14px;
  }
  .danger {
    color: var(--color-negative);
  }
  .sep {
    height: 1px;
    margin: 4px 6px;
    background: var(--color-rule);
  }
</style>
