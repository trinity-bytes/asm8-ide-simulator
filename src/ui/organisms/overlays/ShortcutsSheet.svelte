<script lang="ts">
  import Kbd from '../../atoms/Kbd.svelte';
  import Dialog from '../../molecules/Dialog.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const groups = $derived.by(() => {
    const map = new Map<string, { title: string; keys: string }[]>();
    for (const c of app.commands) {
      if (!c.keys) continue;
      map.set(c.category, [...(map.get(c.category) ?? []), { title: c.title, keys: c.keys }]);
    }
    return [...map];
  });
  const editorKeys = [
    { title: 'Find in file', keys: 'Ctrl+F' },
    { title: 'Undo / Redo', keys: 'Ctrl+Z / Ctrl+Shift+Z' },
    { title: 'Toggle comment', keys: 'Ctrl+/' },
    { title: 'Show quick fix', keys: 'Ctrl+.' },
    { title: 'Suggest', keys: 'Ctrl+Space' },
  ];
</script>

<Dialog title="Keyboard shortcuts" width={720} onclose={() => (app.ui.overlay = null)}>
  <div class="cols">
    {#each [...groups, ['Editor', editorKeys] as const] as [category, list] (category)}
      <section>
        <h3>{category}</h3>
        <dl>
          {#each list as k (k.title)}
            <div>
              <dt>{k.title}</dt>
              <dd><Kbd keys={k.keys} /></dd>
            </div>
          {/each}
        </dl>
      </section>
    {/each}
  </div>
</Dialog>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px 32px;
    max-height: 60vh;
    overflow-y: auto;
    padding-bottom: 16px;
  }
  h3 {
    margin: 12px 0 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-muted);
  }
  dl {
    margin: 0;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 4px 0;
    border-bottom: 1px solid var(--color-rule);
  }
  dt {
    color: var(--color-text);
  }
  dd {
    margin: 0;
  }
</style>
