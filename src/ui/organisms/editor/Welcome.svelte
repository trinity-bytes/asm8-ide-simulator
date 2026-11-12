<script lang="ts">
  import { EXAMPLES } from '@app/workspace/examples';
  import Icon from '../../atoms/Icon.svelte';
  import Kbd from '../../atoms/Kbd.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const ws = app.workspace;
  const ago = (t: number) => {
    const days = Math.floor((Date.now() - t) / 86_400_000);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  };
</script>

<div class="welcome">
  <div class="inner">
    <h1>Asm8</h1>
    <p class="lead">A simulator for an 8-bit CPU. Write assembly, run it, watch every byte.</p>
    <div class="cols">
      <section>
        <h2>Start</h2>
        <ul>
          <li>
            <button type="button" onclick={() => app.openFolder()}
              ><Icon name="folder" />{ws.provider.canOpenFolders
                ? 'Open folder…'
                : 'Browser workspace'}</button
            ><Kbd keys="Ctrl+K O" />
          </li>
          <li>
            <button type="button" onclick={() => ws.importFiles()}><Icon name="file" />Open file…</button><Kbd
              keys="Ctrl+O"
            />
          </li>
          <li>
            <button type="button" onclick={() => app.newFile()}><Icon name="newFile" />New file</button><Kbd
              keys="Alt+N"
            />
          </li>
          <li>
            <button type="button" onclick={() => (app.ui.overlay = { kind: 'shortcuts' })}
              ><Icon name="keyboard" />Keyboard shortcuts</button
            ><Kbd keys="Ctrl+K S" />
          </li>
        </ul>
      </section>
      <section>
        <h2>Recent</h2>
        <ul>
          {#each ws.recents as r (r.id)}
            <li>
              <button type="button" onclick={() => ws.openRecent(r.id)}><Icon name="folder" />{r.name}</button
              ><span class="meta">{ago(r.openedAt)}</span>
            </li>
          {:else}
            <li class="none">Folders you open appear here.</li>
          {/each}
        </ul>
      </section>
      <section>
        <h2>Examples</h2>
        <ul>
          {#each EXAMPLES as e (e.file)}
            <li>
              <button type="button" onclick={() => app.openExample(e.file)}
                ><Icon name="reference" />{e.file}</button
              ><span class="meta">{e.summary}</span>
            </li>
          {/each}
        </ul>
      </section>
    </div>
    <p class="foot">
      <Icon name="install" size={14} />
      {#if app.installAvailable}
        Works offline after the first visit. <button type="button" class="link" onclick={() => app.install()}
          >Install Asm8</button
        > to open .asm files from your file manager.
      {:else if app.installed}
        Installed. Asm8 works offline.
      {:else}
        Works offline after the first visit. Install it from the browser menu to open .asm files from your
        file manager.
      {/if}
    </p>
  </div>
</div>

<style>
  .welcome {
    height: 100%;
    overflow: auto;
    background: var(--color-surface);
  }
  .inner {
    max-width: 1020px;
    padding: 64px 72px;
  }
  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 600;
  }
  .lead {
    margin: 6px 0 40px;
    color: var(--color-muted);
    font-size: 15px;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 32px 56px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 30px;
  }
  li button {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    min-height: 28px;
  }
  li button:hover {
    color: var(--color-accent);
  }
  .meta {
    color: var(--color-muted);
    font-size: 12px;
    white-space: nowrap;
  }
  .none {
    color: var(--color-muted);
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 40px;
    color: var(--color-muted);
    font-size: 13px;
  }
  .link {
    color: var(--color-accent);
    text-decoration: underline;
  }
  @media (max-width: 700px) {
    .inner {
      padding: 32px 20px;
    }
  }
</style>
