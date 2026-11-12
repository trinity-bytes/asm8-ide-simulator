<script lang="ts">
  import { AppController } from '../../state/app.svelte';
  import { applyTheme, THEMES, type ThemeId } from '../../theme/themes';

  const app = AppController.use();
  const original = app.settings.value.theme;
  let index = $state(
    Math.max(
      0,
      THEMES.findIndex((t) => t.id === original),
    ),
  );
  let list: HTMLUListElement | null = $state(null);

  // Arrow keys preview the theme live; Enter keeps it, Escape goes back.
  $effect(() => applyTheme(THEMES[index]!.id));
  $effect(() => {
    list?.focus();
  });

  function done(keep: boolean) {
    const id: ThemeId = keep ? THEMES[index]!.id : original;
    app.settings.set('theme', id);
    applyTheme(id);
    app.ui.overlay = null;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') index = (index + 1) % THEMES.length;
    else if (e.key === 'ArrowUp') index = (index - 1 + THEMES.length) % THEMES.length;
    else if (e.key === 'Enter') done(true);
    else if (e.key === 'Escape') done(false);
    else return;
    e.preventDefault();
  }
</script>

<div class="scrim" role="presentation" onclick={() => done(false)}></div>
<div class="picker" role="dialog" aria-modal="true" aria-label="Color theme">
  <p class="title">Color theme <span>↑↓ preview · Enter keep · Esc cancel</span></p>
  <ul
    bind:this={list}
    role="listbox"
    tabindex="0"
    aria-label="Themes"
    aria-activedescendant="theme-{index}"
    {onkeydown}
  >
    {#each THEMES as t, i (t.id)}
      <li
        id="theme-{i}"
        role="option"
        aria-selected={i === index}
        class:sel={i === index}
        onclick={() => ((index = i), done(true))}
        onmouseenter={() => (index = i)}
        onkeydown={() => {}}
      >
        <span class="sw" style:background={t.swatches[0]}
          >{#each t.swatches.slice(1) as c, i (i)}<i style:background={c}></i>{/each}</span
        >
        <span>{t.name}</span>
        {#if t.id === original}<span class="cur">current</span>{/if}
        {#if t.id === 'asm8-dark'}<span class="cur">meets contrast</span>{/if}
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
  .picker {
    position: fixed;
    z-index: 41;
    top: 52px;
    left: 50%;
    transform: translateX(-50%);
    width: min(420px, calc(100vw - 24px));
    padding: 8px;
    border-radius: 10px;
    background: var(--color-raised);
    box-shadow: var(--shadow-pop);
  }
  .title {
    margin: 4px 8px 8px;
    font-weight: 600;
  }
  .title span {
    margin-left: 8px;
    font-weight: 400;
    font-size: 12px;
    color: var(--color-muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 34px;
    padding: 0 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .sel {
    background: var(--color-control);
  }
  .sw {
    display: flex;
    gap: 2px;
    padding: 5px;
    border-radius: 4px;
  }
  .sw i {
    width: 6px;
    height: 12px;
    border-radius: 1px;
  }
  .cur {
    margin-left: auto;
    font-size: 12px;
    color: var(--color-muted);
  }
  .sel .cur {
    color: var(--color-text);
  }
</style>
