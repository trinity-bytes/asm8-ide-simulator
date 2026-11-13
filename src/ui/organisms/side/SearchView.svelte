<script lang="ts">
  import Button from '../../atoms/Button.svelte';
  import TextField from '../../atoms/TextField.svelte';
  import ToggleChip from '../../atoms/ToggleChip.svelte';
  import SectionHeader from '../../molecules/SectionHeader.svelte';
  import { t, tn } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const ws = app.workspace;
  let replace = $state('');
  let matchCase = $state(false);
  let wholeWord = $state(false);
  let results = $state<{ path: string; hits: { line: number; text: string; from: number; to: number }[] }[]>(
    [],
  );
  let searching = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const MAX_HITS = 500;

  function pattern(q: string): RegExp | null {
    if (!q) return null;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(wholeWord ? `\\b${escaped}\\b` : escaped, matchCase ? 'g' : 'gi');
  }

  async function textOf(path: string): Promise<string> {
    const open = ws.tabs.find((t) => t.kind === 'file' && t.key === path);
    if (open) return open.text;
    return (await ws.fs?.read(path))?.text ?? '';
  }

  async function run() {
    const re = pattern(app.ui.searchQuery);
    if (!re || !ws.fs) {
      results = [];
      return;
    }
    searching = true;
    const out: typeof results = [];
    let total = 0;
    for (const e of ws.entries) {
      if (e.kind !== 'file' || total >= MAX_HITS) continue;
      const lines = (await textOf(e.path)).split('\n');
      const hits: (typeof results)[number]['hits'] = [];
      lines.forEach((text, line) => {
        for (const m of text.matchAll(re)) {
          if (total >= MAX_HITS) break;
          hits.push({ line, text, from: m.index, to: m.index + m[0].length });
          total++;
        }
      });
      if (hits.length) out.push({ path: e.path, hits });
    }
    results = out;
    searching = false;
  }

  $effect(() => {
    void app.ui.searchQuery;
    void matchCase;
    void wholeWord;
    void ws.entries;
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  });

  const total = $derived(results.reduce((n, r) => n + r.hits.length, 0));

  async function replaceAll() {
    const re = pattern(app.ui.searchQuery);
    if (!re) return;
    let files = 0;
    for (const r of results) {
      const tab = (await ws.openFile(r.path, false))!;
      if (!tab) continue;
      ws.updateText(tab.id, tab.text.replace(re, replace));
      files++;
    }
    app.ui.toast(tn('panels.search.replaced', files));
    await run();
  }

  async function reveal(path: string, line: number) {
    await ws.openFile(path);
    app.editor?.gotoLine(line);
  }
</script>

<section class="view" aria-label={t('panels.search.title')}>
  <SectionHeader title={t('panels.search.title')} />
  <div class="fields">
    <TextField
      bind:value={app.ui.searchQuery}
      label={t('panels.search.inFiles')}
      placeholder={t('panels.search.inFiles')}
      icon="search"
    />
    <TextField
      bind:value={replace}
      label={t('panels.search.replaceWith')}
      placeholder={t('panels.search.replace')}
    />
    <div class="opts">
      <ToggleChip pressed={matchCase} onclick={() => (matchCase = !matchCase)}
        >{t('panels.search.matchCase')}</ToggleChip
      >
      <ToggleChip pressed={wholeWord} onclick={() => (wholeWord = !wholeWord)}
        >{t('panels.search.wholeWord')}</ToggleChip
      >
      <span class="grow"></span>
      <Button size="sm" disabled={!total} onclick={replaceAll}>{t('panels.search.replaceAll')}</Button>
    </div>
  </div>
  {#if !ws.fs}
    <p class="hint">{t('panels.search.noFolder')}</p>
  {:else if app.ui.searchQuery}
    <p class="hint" aria-live="polite">
      {searching
        ? t('panels.search.searching')
        : t('panels.search.summary', {
            results: tn('panels.search.results', total, { n: `${total}${total >= MAX_HITS ? '+' : ''}` }),
            files: tn('panels.search.files', results.length),
          })}
    </p>
    {#each results as r (r.path)}
      <div class="file">
        <div class="path">{r.path} <span class="count mono">{r.hits.length}</span></div>
        {#each r.hits as h, i (i)}
          <button type="button" class="hit" onclick={() => reveal(r.path, h.line)}>
            <span class="ln mono">{h.line + 1}</span>
            <span class="text mono"
              >{h.text.slice(Math.max(0, h.from - 20), h.from).trimStart()}<mark
                >{h.text.slice(h.from, h.to)}</mark
              >{h.text.slice(h.to, h.to + 40)}</span
            >
          </button>
        {/each}
      </div>
    {/each}
  {/if}
</section>

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    overflow-y: auto;
    min-height: 0;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 16px 4px;
  }
  .opts {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .grow {
    flex: 1;
  }
  .hint {
    margin: 0 16px;
    color: var(--color-muted);
    font-size: 12px;
  }
  .path {
    display: flex;
    justify-content: space-between;
    padding: 6px 16px 2px;
    font-weight: 500;
  }
  .count {
    color: var(--color-muted);
    font-size: 11px;
    font-weight: 400;
  }
  .hit {
    display: flex;
    gap: 10px;
    width: 100%;
    height: 26px;
    align-items: center;
    padding: 0 16px 0 24px;
    text-align: left;
  }
  .hit:hover {
    background: var(--color-raised);
  }
  .hit:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .ln {
    width: 24px;
    flex: none;
    color: var(--color-muted);
    font-size: 11px;
    text-align: right;
  }
  .text {
    font-size: 12px;
    white-space: pre;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  mark {
    background: color-mix(in srgb, var(--color-warning) 30%, transparent);
    color: var(--color-text);
    border-radius: 2px;
  }
</style>
