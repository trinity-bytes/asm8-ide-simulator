<script lang="ts">
  import { hex } from '@core/index';
  import Button from '../../atoms/Button.svelte';
  import IconButton from '../../atoms/IconButton.svelte';
  import ExplorerRow from '../../molecules/ExplorerRow.svelte';
  import SectionHeader from '../../molecules/SectionHeader.svelte';
  import { AppController } from '../../state/app.svelte';
  import type { FileEntry } from '@app/workspace/file-system';

  interface Props {
    touch?: boolean;
    /** Called after a file is opened (sheets close themselves). */
    onopened?: () => void;
  }
  let { touch = false, onopened }: Props = $props();

  const app = AppController.use();
  const ws = app.workspace;
  let renameError = $state<string | null>(null);

  const title = $derived(ws.fs ? ws.fs.name : 'Explorer');
  const labels = $derived(Object.entries(app.activeAssembly?.labels ?? {}));
  const breakpoints = $derived(
    Object.entries(app.session.breakpoints).flatMap(([path, list]) => list.map((b) => ({ path, ...b }))),
  );
  const activeTab = $derived(ws.activeFile);

  const formatSize = (e: FileEntry) =>
    e.kind === 'directory'
      ? String(e.size)
      : e.size >= 1024
        ? `${(e.size / 1024).toFixed(1)} K`
        : `${e.size} B`;
  const lineText = (path: string, line: number) =>
    (ws.tabs.find((t) => t.key === path)?.text.split('\n')[line] ?? '').split(';')[0]!.trim();

  /** Line where a label is defined (`name:` at the start of the line). */
  const labelLine = (name: string) =>
    Math.max(
      0,
      (activeTab?.text.split('\n') ?? []).findIndex((l) => l.trimStart().startsWith(`${name}:`)),
    );

  async function open(e: FileEntry) {
    if (e.kind === 'directory') ws.toggleFolder(e.path);
    else if (await ws.openFile(e.path)) onopened?.();
  }

  async function commitRename(path: string, name: string) {
    if (ws.renaming !== path) return;
    const err = await ws.rename(path, name);
    renameError = err;
    if (!err) ws.renaming = null;
  }

  function menuFor(e: FileEntry | null, ev: MouseEvent) {
    ev.preventDefault();
    if (!ws.fs) return;
    const dir = e ? (e.kind === 'directory' ? e.path : e.path.split('/').slice(0, -1).join('/')) : '';
    app.ui.openMenu(ev.clientX, ev.clientY, [
      { label: 'New file', run: () => void app.newFile(dir) },
      { label: 'New folder', run: () => void app.newFolder(dir) },
      ...(e
        ? ([
            'separator',
            { label: 'Rename', shortcut: 'F2', run: () => ((ws.renaming = e.path), (renameError = null)) },
            ...(e.kind === 'file'
              ? [
                  { label: 'Duplicate', run: () => void ws.duplicate(e.path) },
                  {
                    label: 'Download',
                    run: async () => {
                      const content = await ws.fs?.read(e.path);
                      if (content) ws.provider.download(e.name, content.text);
                    },
                  },
                ]
              : []),
            'separator',
            {
              label: 'Delete',
              danger: true,
              shortcut: 'Delete',
              run: () => void app.deletePath(e.path, e.kind === 'directory'),
            },
          ] as const)
        : []),
    ]);
  }

  function onkeydown(ev: KeyboardEvent) {
    const current = ws.activeFile;
    if (!current || ws.renaming) return;
    if (ev.key === 'F2') {
      ev.preventDefault();
      ws.renaming = current.key;
      renameError = null;
    }
  }
</script>

<section class="view" aria-label="Explorer">
  <SectionHeader {title} id="explorer-title">
    {#snippet actions()}
      {#if ws.fs && !ws.needsAccess}
        <IconButton icon="newFile" label="New file" size="sm" onclick={() => app.newFile()} />
        <IconButton icon="newFolder" label="New folder" size="sm" onclick={() => app.newFolder()} />
        <IconButton icon="refresh" label="Refresh" size="sm" onclick={() => ws.refresh()} />
      {/if}
    {/snippet}
  </SectionHeader>

  {#if !ws.fs}
    <div class="empty">
      <p>No folder open. Asm8 edits the .asm files on your disk directly; nothing is uploaded.</p>
      <Button variant="primary" block onclick={() => app.openFolder()}>
        {ws.provider.canOpenFolders ? 'Open folder' : 'Open browser workspace'}
      </Button>
      <Button block onclick={() => app.newFile()}>New file</Button>
    </div>
  {:else if ws.needsAccess}
    <div class="empty">
      <p>
        Asm8 needs permission again to read and save <strong>{ws.fs.name}</strong>. Installed apps keep
        access.
      </p>
      <Button variant="primary" block onclick={() => ws.allowAccess()}>Allow access again</Button>
    </div>
  {:else}
    <div
      class="tree"
      role="tree"
      tabindex="-1"
      aria-labelledby="explorer-title"
      {onkeydown}
      oncontextmenu={(e) => e.target === e.currentTarget && menuFor(null, e)}
    >
      {#each ws.visibleEntries as e (e.path)}
        <div role="treeitem" aria-selected={activeTab?.key === e.path} aria-level={e.depth + 1}>
          <ExplorerRow
            name={e.name}
            kind={e.kind}
            depth={e.depth}
            meta={formatSize(e)}
            active={activeTab?.key === e.path}
            expanded={!!ws.expanded[e.path]}
            renaming={ws.renaming === e.path}
            renameError={ws.renaming === e.path ? renameError : null}
            {touch}
            onopen={() => open(e)}
            oncontextmenu={(ev) => menuFor(e, ev)}
            onrename={(name) => commitRename(e.path, name)}
            oncancelrename={() => ((ws.renaming = null), (renameError = null))}
          />
        </div>
      {:else}
        <p class="hint">This folder has no files yet. Create one with New file.</p>
      {/each}
    </div>
    {#if ws.fs.kind === 'browser'}
      <p class="note">Browser workspace: files live in this browser. Use Download to keep a copy.</p>
    {:else if ws.fs.kind === 'examples'}
      <p class="note">Examples are kept in memory. Open a folder to save your own programs.</p>
    {/if}
  {/if}

  {#if labels.length}
    <SectionHeader title="Outline" meta="{labels.length} label{labels.length === 1 ? '' : 's'}" />
    <ul class="list">
      {#each labels as [name, address] (name)}
        <li>
          <button type="button" class="item" onclick={() => app.editor?.gotoLine(labelLine(name))}>
            <span class="mono">{name}</span>
            <span class="mono muted">0x{hex(address)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if breakpoints.length}
    <SectionHeader title="Breakpoints" meta={String(breakpoints.length)} />
    <ul class="list">
      {#each breakpoints as b (`${b.path}:${b.line}`)}
        <li>
          <button
            type="button"
            class="item"
            onclick={async () => {
              await ws.openFile(b.path);
              app.editor?.gotoLine(b.line);
            }}
          >
            <span class="bp"
              ><span class="dot" class:off={b.enabled === false}></span>{b.path.split('/').pop()}:{b.line +
                1}</span
            >
            <span class="mono muted code">{lineText(b.path, b.line)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 0;
    min-height: 0;
    overflow-y: auto;
  }
  .empty {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 16px 12px;
  }
  .empty p {
    margin: 0;
    color: var(--color-muted);
    line-height: 1.45;
  }
  .empty strong {
    color: var(--color-text);
    font-weight: 500;
  }
  .tree {
    margin-bottom: 12px;
  }
  .hint,
  .note {
    margin: 4px 16px 12px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .list {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    height: 28px;
    padding: 0 16px;
    text-align: left;
  }
  .item:hover {
    background: var(--color-raised);
  }
  .item:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .muted {
    font-size: 11px;
  }
  .code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bp {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-negative);
  }
  .dot.off {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--color-muted);
  }
</style>
