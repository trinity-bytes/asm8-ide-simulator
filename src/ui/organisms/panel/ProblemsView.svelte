<script lang="ts">
  import Icon from '../../atoms/Icon.svelte';
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const diagnostics = $derived(app.activeAssembly?.diagnostics ?? []);
  const file = $derived(app.workspace.activeFile);

  function applyFix(line: number, from: number, to: number, replacement: string) {
    const tab = app.workspace.activeFile;
    if (!tab) return;
    const lines = tab.text.split('\n');
    const text = lines[line] ?? '';
    lines[line] = text.slice(0, from) + replacement + text.slice(to);
    app.workspace.updateText(tab.id, lines.join('\n'));
  }
</script>

<div class="problems">
  {#if !file}
    <p class="empty">{t('panels.problems.noFile')}</p>
  {:else}
    <ul>
      {#each diagnostics as d, i (i)}
        <li class={d.severity}>
          <Icon name={d.severity === 'error' ? 'error' : 'warning'} size={14} />
          <button type="button" class="msg" onclick={() => app.editor?.gotoLine(d.line)}>{d.message}</button>
          <span class="where mono" title="{file.title}:{d.line + 1}"
            >{t('panels.problems.line', { line: d.line + 1 })}</span
          >
          {#if d.fix}
            <button
              type="button"
              class="fix"
              onclick={() => applyFix(d.line, d.from, d.to, d.fix!.replacement)}
            >
              {d.fix.title}
            </button>
          {/if}
        </li>
      {:else}
        <li class="empty">{t('panels.problems.none', { file: file.title })}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .problems {
    height: 100%;
    overflow: auto;
    padding: 6px 0;
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
    min-height: 28px;
    padding: 0 16px;
  }
  li:hover {
    background: var(--color-raised);
  }
  .error :global(.icon) {
    color: var(--color-negative);
  }
  .warning :global(.icon) {
    color: var(--color-warning);
  }
  .msg {
    flex: 1;
    min-width: 120px;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .where {
    flex: none;
    color: var(--color-muted);
    font-size: 12px;
  }
  .fix {
    flex: none;
  }
  .fix {
    font-size: 12px;
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .empty {
    color: var(--color-muted);
    padding: 4px 16px;
  }
  .empty:hover {
    background: none;
  }
</style>
