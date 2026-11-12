<script lang="ts">
  import { SPEEDS, speedLabel, type Speed } from '@app/run/protocol';
  import { FONT_SIZES, SCROLLBACK_SIZES, TAB_SIZES, type Settings } from '@app/settings/settings';
  import Button from '../../atoms/Button.svelte';
  import Segmented from '../../atoms/Segmented.svelte';
  import Select from '../../atoms/Select.svelte';
  import Switch from '../../atoms/Switch.svelte';
  import TextField from '../../atoms/TextField.svelte';
  import { AppController } from '../../state/app.svelte';
  import { applyTheme, THEMES, type ThemeId } from '../../theme/themes';

  const app = AppController.use();
  const st = app.settings;
  let query = $state('');
  let body: HTMLDivElement | null = $state(null);
  let current = $state('Editor');

  type Row = { section: string; key: string; title: string; desc: string };
  const ROWS: Row[] = [
    { section: 'Editor', key: 'fontSize', title: 'Font size', desc: 'Code and console text.' },
    { section: 'Editor', key: 'tabSize', title: 'Tab size', desc: 'Spaces per tab when you press Tab.' },
    {
      section: 'Editor',
      key: 'showAddresses',
      title: 'Byte addresses in the gutter',
      desc: 'Show where each line lands in memory.',
    },
    {
      section: 'Editor',
      key: 'inlineHints',
      title: 'Inline hints',
      desc: 'Show results and errors at the end of the line.',
    },
    { section: 'Run', key: 'defaultSpeed', title: 'Default speed', desc: 'Clock speed when you press Run.' },
    {
      section: 'Run',
      key: 'pauseOnFault',
      title: 'Pause on runtime faults',
      desc: 'Stop and point at the line instead of halting.',
    },
    {
      section: 'Machine',
      key: 'numberBase',
      title: 'Number base',
      desc: 'How registers and memory values are shown.',
    },
    {
      section: 'Machine',
      key: 'markChanges',
      title: 'Mark changed values',
      desc: 'Highlight registers and bytes changed by the last step.',
    },
    {
      section: 'Console',
      key: 'scrollback',
      title: 'Console scrollback',
      desc: 'Lines kept before the oldest are dropped.',
    },
    {
      section: 'Console',
      key: 'consoleWrap',
      title: 'Wrap long lines',
      desc: 'Off: long lines scroll sideways.',
    },
    {
      section: 'Appearance',
      key: 'theme',
      title: 'Color theme',
      desc: 'Asm8 Dark meets contrast guidelines; the others keep their original colors.',
    },
    {
      section: 'Keyboard',
      key: 'shortcuts',
      title: 'Keyboard shortcuts',
      desc: 'Every command and its keys.',
    },
    {
      section: 'App',
      key: 'install',
      title: 'Install Asm8',
      desc: 'Open it like any app, work offline and keep folder access.',
    },
  ];
  const SECTIONS = ['Editor', 'Run', 'Machine', 'Console', 'Appearance', 'Keyboard', 'App'];

  const visible = $derived(
    ROWS.filter(
      (r) =>
        !query.trim() ||
        `${r.title} ${r.desc} ${r.section}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );

  function set<K extends keyof Settings>(key: K, v: Settings[K]) {
    st.set(key, v);
    app.applySettings();
  }

  function setTheme(id: ThemeId) {
    set('theme', id);
    applyTheme(id);
  }

  function jump(section: string) {
    current = section;
    body
      ?.querySelector(`[data-section="${section}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
</script>

<div class="settings">
  <div class="search">
    <TextField bind:value={query} label="Search settings" placeholder="Search settings" icon="search" />
  </div>
  <div class="layout">
    <nav aria-label="Settings sections">
      {#each SECTIONS as sec (sec)}
        <button
          type="button"
          class:active={current === sec}
          aria-current={current === sec ? 'true' : undefined}
          onclick={() => jump(sec)}>{sec}</button
        >
      {/each}
    </nav>
    <div class="body" bind:this={body}>
      {#each SECTIONS as sec (sec)}
        {@const rows = visible.filter((r) => r.section === sec)}
        {#if rows.length}
          <h2 data-section={sec}>{sec}</h2>
          {#each rows as r (r.key)}
            <div class="row">
              <div class="text">
                <label for="set-{r.key}">{r.title}</label>
                <p>{r.desc}</p>
              </div>
              <div class="control">
                {#if r.key === 'fontSize'}
                  <Select
                    id="set-fontSize"
                    label="Font size"
                    value={st.value.fontSize}
                    options={FONT_SIZES.map((v) => ({ value: v, label: `${v} px` }))}
                    onchange={(v) => set('fontSize', v)}
                  />
                {:else if r.key === 'tabSize'}
                  <Select
                    id="set-tabSize"
                    label="Tab size"
                    value={st.value.tabSize}
                    options={TAB_SIZES.map((v) => ({ value: v, label: String(v) }))}
                    onchange={(v) => set('tabSize', v)}
                  />
                {:else if r.key === 'showAddresses'}
                  <Switch
                    id="set-showAddresses"
                    label={r.title}
                    checked={st.value.showAddresses}
                    onchange={(v) => set('showAddresses', v)}
                  />
                {:else if r.key === 'inlineHints'}
                  <Switch
                    id="set-inlineHints"
                    label={r.title}
                    checked={st.value.inlineHints}
                    onchange={(v) => set('inlineHints', v)}
                  />
                {:else if r.key === 'defaultSpeed'}
                  <Select
                    id="set-defaultSpeed"
                    label="Default speed"
                    value={String(st.value.defaultSpeed)}
                    options={SPEEDS.map((v) => ({ value: String(v), label: speedLabel(v) }))}
                    onchange={(v) => {
                      const speed = (v === 'max' ? 'max' : Number(v)) as Speed;
                      set('defaultSpeed', speed);
                      app.setSpeed(speed);
                    }}
                  />
                {:else if r.key === 'pauseOnFault'}
                  <Switch
                    id="set-pauseOnFault"
                    label={r.title}
                    checked={st.value.pauseOnFault}
                    onchange={(v) => set('pauseOnFault', v)}
                  />
                {:else if r.key === 'numberBase'}
                  <Segmented
                    label="Number base"
                    value={st.value.numberBase}
                    options={[
                      { value: 'hex', label: 'Hex' },
                      { value: 'dec', label: 'Dec' },
                      { value: 'bin', label: 'Bin' },
                    ]}
                    onchange={(v) => set('numberBase', v)}
                  />
                {:else if r.key === 'markChanges'}
                  <Switch
                    id="set-markChanges"
                    label={r.title}
                    checked={st.value.markChanges}
                    onchange={(v) => set('markChanges', v)}
                  />
                {:else if r.key === 'scrollback'}
                  <Select
                    id="set-scrollback"
                    label="Console scrollback"
                    value={st.value.scrollback}
                    options={SCROLLBACK_SIZES.map((v) => ({
                      value: v,
                      label: `${v.toLocaleString('en')} lines`,
                    }))}
                    onchange={(v) => set('scrollback', v)}
                  />
                {:else if r.key === 'consoleWrap'}
                  <Switch
                    id="set-consoleWrap"
                    label={r.title}
                    checked={st.value.consoleWrap}
                    onchange={(v) => set('consoleWrap', v)}
                  />
                {:else if r.key === 'theme'}
                  <div class="themes" role="radiogroup" aria-label="Color theme" id="set-theme">
                    {#each THEMES as t (t.id)}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={st.value.theme === t.id}
                        class="theme"
                        onclick={() => setTheme(t.id)}
                      >
                        <span class="sw" style:background={t.swatches[0]}>
                          {#each t.swatches.slice(1) as c (c)}<i style:background={c}></i>{/each}
                        </span>
                        {t.name}
                      </button>
                    {/each}
                  </div>
                {:else if r.key === 'shortcuts'}
                  <Button id="set-shortcuts" onclick={() => (app.ui.overlay = { kind: 'shortcuts' })}
                    >Show shortcuts</Button
                  >
                {:else if r.key === 'install'}
                  {#if app.installed}
                    <span class="muted">Installed</span>
                  {:else}
                    <Button id="set-install" disabled={!app.installAvailable} onclick={() => app.install()}
                      >Install</Button
                    >
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      {:else}
        <p class="muted">No setting matches “{query}”.</p>
      {/each}
      <p class="foot muted">
        Settings are saved automatically in this browser. <button
          type="button"
          class="link"
          onclick={() => (app.ui.overlay = { kind: 'about' })}>About Asm8</button
        >
      </p>
    </div>
  </div>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    min-height: 0;
  }
  .search {
    max-width: 480px;
    padding: 20px 32px 12px;
  }
  .layout {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }
  nav {
    display: flex;
    flex-direction: column;
    padding: 12px 0 0 32px;
  }
  nav button {
    position: relative;
    height: 25px;
    padding-left: 12px;
    text-align: left;
    color: var(--color-muted);
  }
  nav button:hover,
  nav .active {
    color: var(--color-text);
  }
  nav .active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 1px;
    background: var(--color-accent);
  }
  .body {
    overflow-y: auto;
    padding: 0 32px 40px 0;
  }
  h2 {
    margin: 20px 0 4px;
    font-size: 14px;
    font-weight: 600;
    scroll-margin-top: 12px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 10px 0;
    border-top: 1px solid var(--color-rule);
  }
  label {
    font-weight: 500;
  }
  .text p {
    margin: 2px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }
  .control {
    flex: none;
  }
  .themes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .theme {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 10px 0 4px;
    border-radius: 6px;
    border: 1px solid var(--color-control);
    font-size: 12px;
    text-align: left;
  }
  .theme[aria-checked='true'] {
    border-color: var(--color-text);
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
  .muted {
    color: var(--color-muted);
  }
  .foot {
    margin-top: 24px;
    font-size: 12px;
  }
  .link {
    color: var(--color-accent);
    text-decoration: underline;
  }
  @media (max-width: 760px) {
    .layout {
      grid-template-columns: 1fr;
    }
    nav {
      display: none;
    }
    .body,
    .search {
      padding-left: 16px;
      padding-right: 16px;
    }
    .row {
      flex-wrap: wrap;
    }
  }
</style>
