<script lang="ts">
  import { findInstruction, GROUP_ORDER, hex, INSTRUCTIONS } from '@core/index';
  import Button from '../../atoms/Button.svelte';
  import { AppController } from '../../state/app.svelte';

  interface Props {
    mnemonic: string;
  }
  let { mnemonic }: Props = $props();
  const app = AppController.use();
  const doc = $derived(findInstruction(mnemonic));
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

{#if doc}
  <article class="ref">
    <header>
      <h1 class="mono">{doc.mnemonic}</h1>
      <span class="sub">{doc.summary.replace(/\.$/, '')}</span>
      {#if doc.isNew}<span class="new">new in Asm8</span>{/if}
    </header>
    <p class="details">{doc.details}</p>
    {#if doc.aliases.length}<p class="aliases">Also written {doc.aliases.join(', ')}.</p>{/if}

    <table>
      <thead
        ><tr
          ><th>Form</th><th>Example</th><th>Opcode</th><th>Bytes</th><th
            ><span class="sr-only">Insert</span></th
          ></tr
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
                >Insert</button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <dl>
      <div>
        <dt>Flags</dt>
        <dd>{doc.flags}</dd>
      </div>
      <div>
        <dt>Group</dt>
        <dd>{doc.group}</dd>
      </div>
      <div>
        <dt>In this file</dt>
        <dd class="mono">used {uses} time{uses === 1 ? '' : 's'}</dd>
      </div>
    </dl>

    <div class="actions">
      <Button onclick={() => app.insertExample(doc.example)}>Insert example at cursor</Button>
      {#if next}<Button variant="ghost" onclick={() => app.openReference(next.mnemonic)}
          >Next: {next.mnemonic}</Button
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
  table {
    width: 100%;
    margin: 24px 0;
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
  dl {
    display: flex;
    gap: 48px;
    margin: 0 0 28px;
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
    gap: 12px;
  }
</style>
