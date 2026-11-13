<script lang="ts">
  import Icon from '../atoms/Icon.svelte';
  import { t } from '../i18n/i18n.svelte';

  interface Props {
    name: string;
    kind: 'file' | 'directory';
    depth: number;
    meta: string;
    active?: boolean;
    expanded?: boolean;
    renaming?: boolean;
    renameError?: string | null;
    touch?: boolean;
    onopen: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    onrename?: (name: string) => void;
    oncancelrename?: () => void;
  }
  let {
    name,
    kind,
    depth,
    meta,
    active = false,
    expanded = false,
    renaming = false,
    renameError = null,
    touch = false,
    onopen,
    oncontextmenu,
    onrename,
    oncancelrename,
  }: Props = $props();

  let draft = $state('');
  let input: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (renaming && input) {
      draft = name;
      input.focus();
      const dot = name.lastIndexOf('.');
      input.setSelectionRange(0, kind === 'file' && dot > 0 ? dot : name.length);
    }
  });
</script>

{#if renaming}
  <div class="row renaming" style:padding-left="{16 + depth * 14}px">
    <span class="chev"></span>
    <Icon name={kind === 'file' ? 'file' : 'folder'} size={16} />
    <input
      bind:this={input}
      bind:value={draft}
      class="rename"
      class:invalid={renameError}
      aria-label={t('shell.explorer.newName', { name })}
      aria-invalid={renameError ? true : undefined}
      spellcheck="false"
      onkeydown={(e) => {
        if (e.key === 'Enter') onrename?.(draft);
        if (e.key === 'Escape') oncancelrename?.();
      }}
      onblur={() => onrename?.(draft)}
    />
  </div>
  {#if renameError}<p class="rename-error" role="alert">{renameError}</p>{/if}
{:else}
  <button
    type="button"
    class="row"
    class:active
    class:touch
    style:padding-left="{16 + depth * 14}px"
    aria-current={active ? 'page' : undefined}
    aria-expanded={kind === 'directory' ? expanded : undefined}
    onclick={onopen}
    {oncontextmenu}
    title={name}
  >
    <span class="chev">
      {#if kind === 'directory'}<Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} />{/if}
    </span>
    <Icon name={kind === 'file' ? 'file' : 'folder'} size={16} />
    <span class="name">{name}</span>
    <span class="meta mono">{meta}</span>
  </button>
{/if}

<style>
  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 28px;
    padding-right: 16px;
    color: var(--color-muted);
    text-align: left;
  }
  .touch {
    height: 40px;
  }
  .row:hover {
    background: var(--color-raised);
    color: var(--color-text);
  }
  .active {
    background: var(--color-raised);
    color: var(--color-text);
  }
  .active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--color-accent);
  }
  .row:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .chev {
    display: inline-grid;
    width: 14px;
    flex: none;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text);
  }
  .meta {
    font-size: 11px;
    flex: none;
  }
  .rename {
    flex: 1;
    min-width: 0;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--color-accent);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .rename.invalid {
    border-color: var(--color-negative);
  }
  .rename-error {
    margin: 2px 16px 6px;
    padding: 6px 8px;
    border-radius: 4px;
    background: var(--tint-error);
    color: var(--color-text);
    font-size: 12px;
  }
</style>
