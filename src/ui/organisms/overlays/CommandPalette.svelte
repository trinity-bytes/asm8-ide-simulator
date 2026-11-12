<script lang="ts">
  import Kbd from '../../atoms/Kbd.svelte';
  import { AppController } from '../../state/app.svelte';
  import { fuzzyScore } from '../../state/commands';

  interface Props {
    mode: 'commands' | 'files';
  }
  let { mode }: Props = $props();
  const app = AppController.use();
  const RECENT_KEY = 'asm8.recentCommands.v1';

  // `>` switches a file search into commands, like VS Code. The palette is re-created per mode.
  // svelte-ignore state_referenced_locally
  let query = $state(mode === 'commands' ? '> ' : '');
  let index = $state(0);
  let input: HTMLInputElement | null = $state(null);
  let list: HTMLUListElement | null = $state(null);

  const recent = (() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  })();

  const isCommands = $derived(query.startsWith('>'));
  const q = $derived(isCommands ? query.slice(1).trim() : query.trim());

  type Item = { id: string; title: string; hint?: string; keys?: string; group: string; run: () => void };

  const items = $derived.by((): Item[] => {
    if (isCommands) {
      const all = app.commands
        .filter((c) => !c.enabled || c.enabled())
        .map((c) => ({ c, score: fuzzyScore(`${c.category}: ${c.title}`, q) }))
        .filter((x) => x.score !== null);
      if (!q) {
        const recentItems = recent.map((id) => all.find((x) => x.c.id === id)).filter((x) => x !== undefined);
        const rest = all.filter((x) => !recent.includes(x.c.id));
        return [
          ...recentItems.map((x) => ({ x, group: 'Recently used' })),
          ...rest.map((x) => ({ x, group: recentItems.length ? 'Other commands' : 'Commands' })),
        ].map(({ x, group }) => ({
          id: x.c.id,
          title: `${x.c.category}: ${x.c.title}`,
          keys: x.c.keys,
          group,
          run: x.c.run,
        }));
      }
      return all
        .sort((a, b) => b.score! - a.score!)
        .map(({ c }) => ({
          id: c.id,
          title: `${c.category}: ${c.title}`,
          keys: c.keys,
          group: 'Commands',
          run: c.run,
        }));
    }
    const files = app.workspace.entries.filter((e) => e.kind === 'file');
    return files
      .map((e) => ({ e, score: fuzzyScore(e.path, q) }))
      .filter((x) => x.score !== null)
      .sort((a, b) => b.score! - a.score!)
      .slice(0, 50)
      .map(({ e }) => ({
        id: e.path,
        title: e.name,
        hint: e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/')) : app.workspace.fs?.name,
        group: 'Files',
        run: () => void app.workspace.openFile(e.path),
      }));
  });

  $effect(() => {
    void query;
    index = 0;
  });
  $effect(() => {
    input?.focus();
  });
  $effect(() => {
    list?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  });

  const close = () => (app.ui.overlay = null);

  function choose(item: Item | undefined) {
    if (!item) return;
    close();
    if (isCommands) {
      try {
        localStorage.setItem(
          RECENT_KEY,
          JSON.stringify([item.id, ...recent.filter((r) => r !== item.id)].slice(0, 5)),
        );
      } catch {
        // optional
      }
    }
    queueMicrotask(item.run);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') index = Math.min(index + 1, items.length - 1);
    else if (e.key === 'ArrowUp') index = Math.max(index - 1, 0);
    else if (e.key === 'Enter') choose(items[index]);
    else if (e.key === 'Escape') close();
    else return;
    e.preventDefault();
  }
</script>

<div class="scrim" role="presentation" onclick={close}></div>
<div
  class="palette"
  role="dialog"
  aria-modal="true"
  aria-label={isCommands ? 'Command palette' : 'Go to file'}
>
  <input
    bind:this={input}
    bind:value={query}
    role="combobox"
    aria-expanded="true"
    aria-controls="palette-list"
    aria-activedescendant={items[index] ? `pal-${index}` : undefined}
    aria-label={isCommands ? 'Type a command' : 'Type a file name'}
    placeholder={isCommands ? 'Type a command' : 'Search files by name (type > for commands)'}
    spellcheck="false"
    autocomplete="off"
    {onkeydown}
  />
  <ul bind:this={list} id="palette-list" role="listbox">
    {#each items as item, i (item.id)}
      {#if i === 0 || items[i - 1]!.group !== item.group}
        <li class="group" role="presentation">{item.group}</li>
      {/if}
      <li
        id="pal-{i}"
        data-i={i}
        role="option"
        aria-selected={i === index}
        class:sel={i === index}
        onmousemove={() => (index = i)}
        onclick={() => choose(item)}
        onkeydown={() => {}}
      >
        <span class="title">{item.title}</span>
        {#if item.hint}<span class="hint">{item.hint}</span>{/if}
        {#if item.keys}<Kbd keys={item.keys} />{/if}
      </li>
    {:else}
      <li class="empty">
        {isCommands
          ? 'No matching command'
          : app.workspace.fs
            ? 'No matching file'
            : 'Open a folder to find files'}
      </li>
    {/each}
  </ul>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .palette {
    position: fixed;
    z-index: 41;
    top: 52px;
    left: 50%;
    transform: translateX(-50%);
    width: min(600px, calc(100vw - 24px));
    padding: 8px;
    border-radius: 10px;
    background: var(--color-raised);
    box-shadow: var(--shadow-pop);
  }
  input {
    width: 100%;
    height: 32px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--color-accent);
    background: var(--color-surface);
  }
  input:focus-visible {
    box-shadow: none;
  }
  ul {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    max-height: min(420px, 60vh);
    overflow-y: auto;
  }
  li[role='option'] {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 30px;
    padding: 0 10px 0 30px;
    border-radius: 5px;
    cursor: pointer;
  }
  .sel {
    background: var(--color-control);
  }
  .sel :global(kbd) {
    color: var(--color-text);
  }
  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hint {
    color: var(--color-muted);
    font-size: 12px;
  }
  .sel .hint {
    color: var(--color-text);
  }
  .group {
    padding: 8px 30px 2px;
    font-size: 12px;
    color: var(--color-muted);
  }
  .empty {
    padding: 10px 30px;
    color: var(--color-muted);
  }
</style>
