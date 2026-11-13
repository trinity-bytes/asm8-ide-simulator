<script lang="ts">
  import { findInstruction, GROUP_ORDER, hex, INSTRUCTIONS } from '@core/index';
  import Button from '../../atoms/Button.svelte';
  import { i18n, t, tn } from '../../i18n/i18n.svelte';
  import { groupLabel, instructionText } from '../../i18n/instruction-docs.es';
  import { AppController } from '../../state/app.svelte';

  interface Props {
    mnemonic: string;
  }
  let { mnemonic }: Props = $props();
  const app = AppController.use();
  const doc = $derived(findInstruction(mnemonic));
  const text = $derived(doc ? instructionText(doc, i18n.locale) : undefined);
  const ordered = INSTRUCTIONS.slice().sort(
    (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
  );
  const next = $derived(
    ordered[(ordered.findIndex((i) => i.mnemonic === doc?.mnemonic) + 1) % ordered.length],
  );
  const uses = $derived.by(() => {
    const text = app.workspace.tabs.find((t) => t.kind === 'file')?.text ?? '';
    if (!doc) return 0;
    const names = [doc.mnemonic, ...doc.aliases].join('|');
    return (text.match(new RegExp(`^\\s*(?:[.\\w]+:)?\\s*(${names})\\b`, 'gim')) ?? []).length;
  });

  const EXAMPLE_FOR: Record<string, string> = {
    'reg, reg': 'A, B',
    'reg, [address]': 'A, [0x20]',
    'reg, [reg]': 'A, [C]',
    '[address], reg': '[0xE8], A',
    '[reg], reg': '[D], A',
    'reg, value': 'D, 232',
    '[address], value': '[0x20], 7',
    '[reg], value': "[D], 'H'",
    reg: 'A',
    '[reg]': '[C]',
    '[address]': '[0x20]',
    value: 'loop',
  };
  const exampleOf = (operands: string) => `${doc?.mnemonic} ${EXAMPLE_FOR[operands] ?? ''}`.trim();
</script>

{#if doc && text}
  <article class="ref">
    <header>
      <h1 class="mono">{doc.mnemonic}</h1>
      <span class="sub">{text.summary.replace(/\.$/, '')}</span>
      {#if doc.isNew}<span class="new">{t('docs.page.newIn')}</span>{/if}
    </header>
    <p class="details">{text.details}</p>
    {#if doc.aliases.length}<p class="aliases">
        {t('docs.page.aliases', { list: doc.aliases.join(', ') })}
      </p>{/if}

    <h2>{t('docs.page.forms')}</h2>
    <table>
      <thead
        ><tr
          ><th>{t('docs.page.form')}</th><th>{t('docs.page.example')}</th><th>{t('docs.page.opcode')}</th><th
            >{t('docs.page.bytes')}</th
          ><th><span class="sr-only">{t('docs.page.insert')}</span></th></tr
        ></thead
      >
      <tbody>
        {#each doc.forms as f (f.operands)}
          <tr>
            <td class="mono">{doc.mnemonic} {f.operands}</td>
            <td class="mono lit">{doc.mnemonic === 'DB' ? 'DB "Hi"' : exampleOf(f.operands)}</td>
            <td class="mono muted">{f.opcode < 0 ? '—' : hex(f.opcode)}</td>
            <td class="mono muted">{f.bytes}</td>
            <td class="r">
              <button
                type="button"
                class="ins"
                onclick={() => app.insertExample(doc.mnemonic === 'DB' ? 'DB "Hi"' : exampleOf(f.operands))}
                >{t('docs.page.insert')}</button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <h2>{t('docs.page.examples')}</h2>
    <ol class="examples">
      {#each text.examples as ex, i (i)}
        <li>
          <pre class="mono code">{ex.code}</pre>
          <div class="ex-foot">
            <span class="note">{ex.note}</span>
            <button
              type="button"
              class="ins"
              aria-label={t('docs.page.insertNth', { n: i + 1 })}
              onclick={() => app.insertExample(ex.code)}>{t('docs.page.insert')}</button
            >
          </div>
        </li>
      {/each}
    </ol>

    {#if text.notes.length}
      <h2>{t('docs.page.notes')}</h2>
      <ul class="notes">
        {#each text.notes as n, i (i)}<li>{n}</li>{/each}
      </ul>
    {/if}

    <dl>
      <div>
        <dt>{t('docs.page.flags')}</dt>
        <dd>{text.flags}</dd>
      </div>
      <div>
        <dt>{t('docs.page.group')}</dt>
        <dd>{groupLabel(doc.group)}</dd>
      </div>
      <div>
        <dt>{t('docs.page.inFile')}</dt>
        <dd class="mono">{tn('docs.page.uses', uses)}</dd>
      </div>
    </dl>

    <div class="actions">
      <Button onclick={() => app.insertExample(doc.example)}>{t('docs.page.insertExample')}</Button>
      {#if next}<Button variant="ghost" onclick={() => app.openReference(next.mnemonic)}
          >{t('docs.page.next', { name: next.mnemonic })}</Button
        >{/if}
    </div>
  </article>
{/if}

<style>
  .ref {
    height: 100%;
    overflow: auto;
    padding: 40px 40px 32px;
    background: var(--color-surface);
    max-width: 760px;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 500;
  }
  .sub {
    color: var(--color-muted);
    font-size: 16px;
  }
  .new {
    color: var(--color-accent);
    font-size: 12px;
  }
  .details {
    margin: 12px 0 4px;
    line-height: 1.55;
    font-size: 14px;
  }
  .aliases {
    color: var(--color-muted);
    margin: 0 0 8px;
  }
  h2 {
    margin: 24px 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-muted);
  }
  table {
    width: 100%;
    margin: 0 0 8px;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-weight: 400;
    color: var(--color-muted);
    font-size: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-rule);
  }
  td {
    height: 30px;
    border-bottom: 1px solid var(--color-rule);
    font-size: 13px;
  }
  .lit {
    color: var(--syntax-literal);
  }
  .muted {
    color: var(--color-muted);
  }
  .r {
    text-align: right;
  }
  .ins {
    font-weight: 500;
  }
  .ins:hover {
    color: var(--color-accent);
  }
  .examples {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  .code {
    margin: 0;
    padding: 8px 12px;
    background: var(--color-raised);
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.5;
    tab-size: 8;
    overflow-x: auto;
    color: var(--syntax-literal);
  }
  .ex-foot {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
  }
  .note {
    color: var(--color-muted);
    line-height: 1.45;
  }
  .notes {
    margin: 0;
    padding-left: 18px;
    line-height: 1.55;
  }
  .notes li + li {
    margin-top: 4px;
  }
  dl {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 48px;
    margin: 28px 0;
  }
  dt {
    color: var(--color-muted);
    font-size: 12px;
  }
  dd {
    margin: 2px 0 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  @media (max-width: 600px) {
    .ref {
      padding: 24px 16px;
    }
  }
</style>
