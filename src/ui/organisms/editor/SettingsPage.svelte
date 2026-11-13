<script lang="ts">
  import { SPEEDS, speedLabel, type Speed } from '@app/run/protocol';
  import { FONT_SIZES, LANGUAGES, SCROLLBACK_SIZES, TAB_SIZES, type Settings } from '@app/settings/settings';
  import Button from '../../atoms/Button.svelte';
  import Segmented from '../../atoms/Segmented.svelte';
  import Select from '../../atoms/Select.svelte';
  import Switch from '../../atoms/Switch.svelte';
  import TextField from '../../atoms/TextField.svelte';
  import { i18n, t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';
  import { applyTheme, THEMES, type ThemeId } from '../../theme/themes';

  const app = AppController.use();
  const st = app.settings;
  let query = $state('');
  let body: HTMLDivElement | null = $state(null);
  let current = $state<Section>('Editor');

  type Section = 'Editor' | 'Run' | 'Machine' | 'Console' | 'Appearance' | 'Keyboard' | 'App';
  type RowKey =
    | 'fontSize'
    | 'tabSize'
    | 'showAddresses'
    | 'inlineHints'
    | 'defaultSpeed'
    | 'pauseOnFault'
    | 'numberBase'
    | 'markChanges'
    | 'scrollback'
    | 'consoleWrap'
    | 'theme'
    | 'language'
    | 'shortcuts'
    | 'install';
  /** Stable ids (English); the visible text comes from the message table at render time. */
  type Row = { section: Section; key: RowKey };
  const ROWS: Row[] = [
    { section: 'Editor', key: 'fontSize' },
    { section: 'Editor', key: 'tabSize' },
    { section: 'Editor', key: 'showAddresses' },
    { section: 'Editor', key: 'inlineHints' },
    { section: 'Run', key: 'defaultSpeed' },
    { section: 'Run', key: 'pauseOnFault' },
    { section: 'Machine', key: 'numberBase' },
    { section: 'Machine', key: 'markChanges' },
    { section: 'Console', key: 'scrollback' },
    { section: 'Console', key: 'consoleWrap' },
    { section: 'Appearance', key: 'theme' },
    { section: 'Appearance', key: 'language' },
    { section: 'Keyboard', key: 'shortcuts' },
    { section: 'App', key: 'install' },
  ];
  const SECTIONS: Section[] = ['Editor', 'Run', 'Machine', 'Console', 'Appearance', 'Keyboard', 'App'];

  const title = (r: Row) => t(`editor.settings.${r.key}.title`);
  const desc = (r: Row) => t(`editor.settings.${r.key}.desc`);
  const sectionName = (s: Section) => t(`editor.settings.section.${s}`);
  /** Case- and accent-insensitive, so "tamano" finds "Tamaño". */
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase(i18n.locale);

  const visible = $derived.by(() => {
    const q = fold(query.trim());
    return ROWS.filter((r) => !q || fold(`${title(r)} ${desc(r)} ${sectionName(r.section)}`).includes(q));
  });

  function set<K extends keyof Settings>(key: K, v: Settings[K]) {
    st.set(key, v);
    app.applySettings();
  }

  function setTheme(id: ThemeId) {
    set('theme', id);
    applyTheme(id);
  }

  function jump(section: Section) {
    current = section;
    body
      ?.querySelector(`[data-section="${section}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
</script>

<div class="settings">
  <div class="search">
    <TextField
      bind:value={query}
      label={t('editor.settings.search')}
      placeholder={t('editor.settings.search')}
      icon="search"
    />
  </div>
  <div class="layout">
    <nav aria-label={t('editor.settings.sections')}>
      {#each SECTIONS as sec (sec)}
        <button
          type="button"
          class:active={current === sec}
          aria-current={current === sec ? 'true' : undefined}
          onclick={() => jump(sec)}>{sectionName(sec)}</button
        >
      {/each}
    </nav>
    <div class="body" bind:this={body}>
      {#each SECTIONS as sec (sec)}
        {@const rows = visible.filter((r) => r.section === sec)}
        {#if rows.length}
          <h2 data-section={sec}>{sectionName(sec)}</h2>
          {#each rows as r (r.key)}
            <div class="row">
              <div class="text">
                <label for="set-{r.key}">{title(r)}</label>
                <p>{desc(r)}</p>
              </div>
              <div class="control">
                {#if r.key === 'fontSize'}
                  <Select
                    id="set-fontSize"
                    label={title(r)}
                    value={st.value.fontSize}
                    options={FONT_SIZES.map((v) => ({ value: v, label: `${v} px` }))}
                    onchange={(v) => set('fontSize', v)}
                  />
                {:else if r.key === 'tabSize'}
                  <Select
                    id="set-tabSize"
                    label={title(r)}
                    value={st.value.tabSize}
                    options={TAB_SIZES.map((v) => ({ value: v, label: String(v) }))}
                    onchange={(v) => set('tabSize', v)}
                  />
                {:else if r.key === 'showAddresses'}
                  <Switch
                    id="set-showAddresses"
                    label={title(r)}
                    checked={st.value.showAddresses}
                    onchange={(v) => set('showAddresses', v)}
                  />
                {:else if r.key === 'inlineHints'}
                  <Switch
                    id="set-inlineHints"
                    label={title(r)}
                    checked={st.value.inlineHints}
                    onchange={(v) => set('inlineHints', v)}
                  />
                {:else if r.key === 'defaultSpeed'}
                  <Select
                    id="set-defaultSpeed"
                    label={title(r)}
                    value={String(st.value.defaultSpeed)}
                    options={SPEEDS.map((v) => ({
                      value: String(v),
                      label: v === 'max' ? t('editor.settings.speedMax') : speedLabel(v),
                    }))}
                    onchange={(v) => {
                      const speed = (v === 'max' ? 'max' : Number(v)) as Speed;
                      set('defaultSpeed', speed);
                      app.setSpeed(speed);
                    }}
                  />
                {:else if r.key === 'pauseOnFault'}
                  <Switch
                    id="set-pauseOnFault"
                    label={title(r)}
                    checked={st.value.pauseOnFault}
                    onchange={(v) => set('pauseOnFault', v)}
                  />
                {:else if r.key === 'numberBase'}
                  <Segmented
                    label={title(r)}
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
                    label={title(r)}
                    checked={st.value.markChanges}
                    onchange={(v) => set('markChanges', v)}
                  />
                {:else if r.key === 'scrollback'}
                  <Select
                    id="set-scrollback"
                    label={title(r)}
                    value={st.value.scrollback}
                    options={SCROLLBACK_SIZES.map((v) => ({
                      value: v,
                      label: t('editor.settings.lines', { n: v.toLocaleString(i18n.locale) }),
                    }))}
                    onchange={(v) => set('scrollback', v)}
                  />
                {:else if r.key === 'consoleWrap'}
                  <Switch
                    id="set-consoleWrap"
                    label={title(r)}
                    checked={st.value.consoleWrap}
                    onchange={(v) => set('consoleWrap', v)}
                  />
                {:else if r.key === 'theme'}
                  <div class="themes" role="radiogroup" aria-label={title(r)} id="set-theme">
                    {#each THEMES as theme (theme.id)}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={st.value.theme === theme.id}
                        class="theme"
                        onclick={() => setTheme(theme.id)}
                      >
                        <span class="sw" style:background={theme.swatches[0]}>
                          {#each theme.swatches.slice(1) as c, i (i)}<i style:background={c}></i>{/each}
                        </span>
                        {theme.name}
                      </button>
                    {/each}
                  </div>
                {:else if r.key === 'language'}
                  <Select
                    id="set-language"
                    label={title(r)}
                    value={st.value.language}
                    options={LANGUAGES.map((v) => ({ value: v, label: t(`editor.settings.language.${v}`) }))}
                    onchange={(v) => set('language', v)}
                  />
                {:else if r.key === 'shortcuts'}
                  <Button id="set-shortcuts" onclick={() => (app.ui.overlay = { kind: 'shortcuts' })}
                    >{t('editor.settings.showShortcuts')}</Button
                  >
                {:else if r.key === 'install'}
                  {#if app.installed}
                    <span class="muted">{t('editor.settings.installed')}</span>
                  {:else}
                    <Button id="set-install" disabled={!app.installAvailable} onclick={() => app.install()}
                      >{t('editor.settings.install')}</Button
                    >
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      {/each}
      {#if !visible.length}
        <p class="muted">{t('editor.settings.noMatch', { query })}</p>
      {/if}
      <p class="foot muted">
        {t('editor.settings.savedHere')}
        <button type="button" class="link" onclick={() => (app.ui.overlay = { kind: 'about' })}
          >{t('editor.settings.about')}</button
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
