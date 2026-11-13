<script lang="ts">
  import { GROUP_ORDER, INSTRUCTIONS } from '@core/index';
  import TextField from '../../atoms/TextField.svelte';
  import { EXAMPLES } from '@app/workspace/examples';
  import { EXAMPLE_TEXT } from '../../i18n/examples';
  import { GUIDE, type GuideSection } from '../../i18n/guide';
  import { i18n, t } from '../../i18n/i18n.svelte';
  import { groupLabel, instructionText } from '../../i18n/instruction-docs.es';
  import SectionHeader from '../../molecules/SectionHeader.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  let filter = $state('');
  const active = $derived(app.workspace.active?.kind === 'reference' ? app.workspace.active.key : null);
  const query = $derived(filter.trim().toLowerCase());
  const has = (text: string) => text.toLowerCase().includes(query);

  const groups = $derived.by(() => {
    const locale = i18n.locale;
    const match = (i: (typeof INSTRUCTIONS)[number]) =>
      !query || has(i.mnemonic) || i.aliases.some(has) || has(instructionText(i, locale).summary);
    return GROUP_ORDER.map((g) => ({
      group: g,
      items: INSTRUCTIONS.filter((i) => i.group === g && match(i)),
    })).filter((g) => g.items.length);
  });

  const programs = $derived(EXAMPLES.map((e) => ({ file: e.file, ...EXAMPLE_TEXT[e.file]![i18n.locale] })));
  const sectionText = (s: GuideSection): string[] => [
    s.title,
    ...s.paragraphs,
    ...(s.table?.rows.flat() ?? []),
    ...(s.examples ?? []).flatMap((e) => [e.code, e.note]),
    ...(s.id === 'programs' ? programs.flatMap((p) => [p.file, p.title, p.description]) : []),
  ];
  const guide = $derived(GUIDE[i18n.locale].filter((s) => !query || sectionText(s).some(has)));
</script>

<section class="view" aria-label={t('docs.view.title')}>
  <SectionHeader title={t('docs.view.title')} />
  <div class="filter">
    <TextField
      bind:value={filter}
      label={t('docs.view.filter')}
      placeholder={t('docs.view.filter')}
      icon="search"
    />
  </div>
  <div class="groups">
    {#if guide.length}
      <h4>{t('docs.view.guide')}</h4>
      {#each guide as s (s.id)}
        <details class="guide">
          <summary>{s.title}</summary>
          <div class="g-body">
            {#each s.paragraphs as p, i (i)}<p>{p}</p>{/each}
            {#if s.table}
              <table>
                <thead
                  ><tr
                    >{#each s.table.head as h (h)}<th>{h}</th>{/each}</tr
                  ></thead
                >
                <tbody>
                  {#each s.table.rows as row, r (r)}
                    <tr
                      >{#each row as cell, c (c)}<td
                          class:mono={c === 0 || (s.table.head.length > 2 && c === 1)}>{cell}</td
                        >{/each}</tr
                    >
                  {/each}
                </tbody>
              </table>
            {/if}
            {#each s.examples ?? [] as ex, i (i)}
              <figure>
                <pre class="mono">{ex.code}</pre>
                <figcaption>{ex.note}</figcaption>
              </figure>
            {/each}
            {#if s.id === 'programs'}
              <ul class="programs">
                {#each programs as p (p.file)}
                  <li>
                    <button
                      type="button"
                      class="program"
                      aria-label={t('docs.guide.openProgramNamed', { name: p.title })}
                      onclick={() => app.openExample(p.file)}
                    >
                      <span class="p-title">{p.title}</span>
                      <span class="p-file mono">{p.file}</span>
                      <span class="p-desc">{p.description}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </details>
      {/each}
    {/if}
    {#each groups as g (g.group)}
      <h4>{groupLabel(g.group)}</h4>
      <ul>
        {#each g.items as i (i.mnemonic)}
          <li>
            <button
              type="button"
              class:active={active === i.mnemonic}
              aria-current={active === i.mnemonic ? 'page' : undefined}
              onclick={() => app.openReference(i.mnemonic)}
            >
              <span class="m mono">{i.mnemonic}</span>
              <span class="s">{instructionText(i, i18n.locale).summary.replace(/\.$/, '')}</span>
              {#if i.isNew}<span class="new">{t('docs.view.new')}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="hint">{t('docs.view.noMatch', { q: filter })}</p>
    {/each}
  </div>
</section>

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    min-height: 0;
  }
  .filter {
    padding: 0 16px 6px;
  }
  .groups {
    overflow-y: auto;
    min-height: 0;
  }
  h4 {
    margin: 10px 16px 2px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  button {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    height: 22px;
    padding: 0 16px;
    text-align: left;
  }
  button:hover,
  .active {
    background: var(--color-raised);
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
  button:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .m {
    width: 40px;
    font-weight: 500;
    font-size: 12px;
  }
  .s {
    flex: 1;
    color: var(--color-muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .active .s {
    color: var(--color-text);
  }
  .new {
    font-size: 11px;
    color: var(--color-accent);
  }
  .guide summary {
    padding: 2px 16px;
    font-size: 12px;
    cursor: pointer;
  }
  .guide summary:hover {
    background: var(--color-raised);
  }
  .guide summary:focus-visible {
    box-shadow: inset var(--focus-ring);
    outline: none;
  }
  .g-body {
    padding: 4px 16px 10px 28px;
    font-size: 12px;
    line-height: 1.5;
  }
  .g-body p {
    margin: 0 0 6px;
  }
  .g-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0 8px;
  }
  .g-body th {
    text-align: left;
    font-weight: 400;
    color: var(--color-muted);
    border-bottom: 1px solid var(--color-rule);
  }
  .g-body td {
    padding: 2px 6px 2px 0;
    border-bottom: 1px solid var(--color-rule);
    vertical-align: top;
  }
  figure {
    margin: 6px 0 10px;
  }
  figure pre {
    margin: 0;
    padding: 6px 8px;
    background: var(--color-raised);
    border-radius: 4px;
    overflow-x: auto;
    tab-size: 8;
    font-size: 11px;
    color: var(--syntax-literal);
  }
  figcaption {
    color: var(--color-muted);
    margin: 2px 0;
  }
  .programs {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
  }
  .program {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 8px;
    width: 100%;
    height: auto;
    padding: 6px 8px;
    margin: 0 0 4px;
    border-radius: 4px;
    text-align: left;
  }
  .program:hover {
    background: var(--color-control);
  }
  .p-title {
    color: var(--color-text);
    font-weight: 500;
  }
  .p-file {
    color: var(--color-muted);
    font-size: 11px;
  }
  .p-desc {
    grid-column: 1 / -1;
    color: var(--color-muted);
  }
  .hint {
    margin: 8px 16px;
    color: var(--color-muted);
  }
</style>
