<script lang="ts">
  import { formatByte, hex } from '@core/index';
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const SHOWN = 500;
  const base = $derived(app.settings.value.numberBase === 'bin' ? 'hex' : app.settings.value.numberBase);
  const rows = $derived(app.session.writes.slice(-SHOWN).reverse());
  const total = $derived(app.session.writes.length);
</script>

<div class="writes">
  {#if total === 0}
    <p class="empty">{t('panels.writes.empty')}</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>{t('panels.writes.step')}</th><th>{t('panels.writes.address')}</th><th
            >{t('panels.writes.old')}</th
          ><th>{t('panels.writes.new')}</th><th>{t('panels.writes.line')}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as w, i (`${w.step}-${w.address}-${i}`)}
          <tr>
            <td class="mono">{w.step}</td>
            <td class="mono"
              >0x{hex(w.address)}{w.address >= 232
                ? ` · ${t('panels.writes.display')}`
                : w.address > 200 && w.address <= 231
                  ? ` · ${t('panels.writes.stack')}`
                  : ''}</td
            >
            <td class="mono muted">{formatByte(w.previous, base)}</td>
            <td class="mono"
              >{formatByte(w.value, base)}{w.value >= 32 && w.value < 127
                ? `  '${String.fromCharCode(w.value)}'`
                : ''}</td
            >
            <td class="mono">
              {#if w.line !== undefined}<button type="button" onclick={() => app.revealLine(w.line!)}
                  >{w.line + 1}</button
                >{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if total > SHOWN}<p class="empty">{t('panels.writes.latest', { shown: SHOWN, total })}</p>{/if}
  {/if}
</div>

<style>
  .writes {
    height: 100%;
    overflow: auto;
    padding: 4px 16px 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    position: sticky;
    top: 0;
    background: var(--color-surface);
    text-align: left;
    font-weight: 500;
    color: var(--color-muted);
    height: 28px;
  }
  td {
    height: 24px;
    border-top: 1px solid var(--color-rule);
  }
  .muted {
    color: var(--color-muted);
  }
  td button {
    color: var(--color-accent);
  }
  .empty {
    color: var(--color-muted);
    margin: 8px 0;
  }
</style>
