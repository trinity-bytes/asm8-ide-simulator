<script lang="ts">
  import { GROUP_ORDER, INSTRUCTIONS } from '@core/index';
  import TextField from '../../atoms/TextField.svelte';
  import SectionHeader from '../../molecules/SectionHeader.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  let filter = $state('');
  const active = $derived(app.workspace.active?.kind === 'reference' ? app.workspace.active.key : null);

  const groups = $derived.by(() => {
    const q = filter.trim().toLowerCase();
    const match = (i: (typeof INSTRUCTIONS)[number]) =>
      !q ||
      i.mnemonic.toLowerCase().includes(q) ||
      i.aliases.some((a) => a.toLowerCase().includes(q)) ||
      i.summary.toLowerCase().includes(q);
    return GROUP_ORDER.map((g) => ({
      group: g,
      items: INSTRUCTIONS.filter((i) => i.group === g && match(i)),
    })).filter((g) => g.items.length);
  });
</script>

<section class="view" aria-label="Instruction set">
  <SectionHeader title="Instruction set" />
  <div class="filter">
    <TextField
      bind:value={filter}
      label="Filter instructions"
      placeholder="Filter instructions"
      icon="search"
    />
  </div>
  <div class="groups">
    {#each groups as g (g.group)}
      <h4>{g.group}</h4>
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
              <span class="s">{i.summary.replace(/\.$/, '')}</span>
              {#if i.isNew}<span class="new">new</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="hint">No instruction matches “{filter}”.</p>
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
  .hint {
    margin: 8px 16px;
    color: var(--color-muted);
  }
</style>
