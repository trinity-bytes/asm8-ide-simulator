<script lang="ts">
  import { callStack, Debugger, describeStack, evaluate, formatByte, hex } from '@core/index';
  import IconButton from '../../atoms/IconButton.svelte';
  import Switch from '../../atoms/Switch.svelte';
  import TextField from '../../atoms/TextField.svelte';
  import SectionHeader from '../../molecules/SectionHeader.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const s = app.session;
  const WATCH_KEY = 'asm8.watch.v1';

  const load = (): string[] => {
    try {
      const v = JSON.parse(localStorage.getItem(WATCH_KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };
  let watches = $state<string[]>(load());
  let draft = $state('');
  let adding = $state(false);

  $effect(() => {
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(watches));
    } catch {
      // optional
    }
  });

  const base = $derived(app.settings.value.numberBase);
  const snap = $derived(s.snapshot);
  const running = $derived(s.running);
  const stateLabel = $derived(
    {
      empty: 'Not started',
      ready: 'Ready',
      running: 'Running',
      paused: 'Paused',
      waiting: 'Waiting',
      halted: 'Halted',
      fault: 'Error',
    }[s.state],
  );

  const frames = $derived.by(() => {
    if (!snap || !s.program) return [];
    const entries = describeStack(snap.memory, snap.registers.sp, s.program.assembly, s.writes);
    return callStack(entries, s.program.assembly);
  });
  const stackBytes = $derived.by(() => {
    if (!snap) return [];
    return describeStack(snap.memory, snap.registers.sp, s.program?.assembly ?? null, s.writes)
      .slice(-6)
      .reverse();
  });
  const labelAt = (line: number | undefined) => {
    if (line === undefined || !s.program) return '';
    const lines = s.program.source.split('\n');
    for (let l = line; l >= 0; l--) {
      const m = /^\s*([.A-Za-z_]\w*):/.exec(lines[l] ?? '');
      if (m && !m[1]!.startsWith('.')) return m[1]!;
    }
    return '';
  };
  const file = $derived(s.program?.path.split('/').pop() ?? '');
  const bps = $derived(
    Object.entries(s.breakpoints).flatMap(([path, list]) => list.map((b) => ({ path, ...b }))),
  );
  const sourceLine = (path: string, line: number) =>
    (app.workspace.tabs.find((t) => t.key === path)?.text.split('\n')[line] ?? '').split(';')[0]!.trim();

  function addWatch() {
    const v = draft.trim();
    if (v) watches = [...watches, v];
    draft = '';
    adding = false;
  }
</script>

<section class="view" aria-label="Run and debug">
  <div class="toolbar" role="toolbar" aria-label="Debug controls">
    <span class="state" class:paused={s.state === 'paused'}>{stateLabel}</span>
    {#if running}
      <IconButton icon="pause" label="Pause (F5)" onclick={() => s.pause()} />
    {:else}
      <IconButton icon="play" label="Continue (F5)" onclick={() => app.run()} />
    {/if}
    <IconButton icon="step" label="Step (F10)" disabled={running} onclick={() => app.step()} />
    <IconButton
      icon="stepOver"
      label="Step over CALL (F11)"
      disabled={running}
      onclick={() => app.step('stepOver')}
    />
    <IconButton
      icon="stepOut"
      label="Step out (Shift+F11)"
      disabled={running}
      onclick={() => app.step('stepOut')}
    />
    <IconButton icon="restart" label="Restart (Ctrl+Shift+F5)" onclick={() => app.restart()} />
    <IconButton
      icon="stop"
      label="Stop (Shift+F5)"
      tone="negative"
      disabled={s.state === 'empty'}
      onclick={() => s.stop()}
    />
  </div>

  <SectionHeader title="Watch">
    {#snippet actions()}
      <IconButton icon="plus" label="Add expression" size="sm" onclick={() => (adding = true)} />
    {/snippet}
  </SectionHeader>
  <ul class="list">
    {#each watches as w, i (i)}
      {@const r = snap ? evaluate(w, snap.registers, snap.memory) : null}
      <li class="row">
        <span class="mono expr">{w}</span>
        <span class="mono val" class:err={r && 'error' in r}>
          {#if !r}—{:else if 'error' in r}{r.error}{:else}{formatByte(r.value & 0xff, base)}{/if}
        </span>
        <IconButton
          icon="close"
          label="Remove {w}"
          size="sm"
          onclick={() => (watches = watches.filter((_, j) => j !== i))}
        />
      </li>
    {:else}
      {#if !adding}<li class="hint">Add an expression: A, [D], [C+1], C - 2, A == 'H'</li>{/if}
    {/each}
  </ul>
  {#if adding}
    <form
      class="add"
      onsubmit={(e) => {
        e.preventDefault();
        addWatch();
      }}
    >
      <TextField
        bind:value={draft}
        label="Watch expression"
        placeholder="e.g. [D] or A + 1"
        mono
        autofocus
        onblur={addWatch}
      />
    </form>
  {/if}

  <SectionHeader title="Call stack" meta="depth {frames.length}" />
  <ul class="list">
    {#if snap && s.program}
      <li class="row frame current">
        <span class="mono">{labelAt(snap.line) || '—'}</span>
        <span class="mono muted">{file}:{(snap.line ?? 0) + 1} · 0x{hex(snap.registers.ip)}</span>
      </li>
      {#each frames as f, i (i)}
        <li class="row frame">
          <span class="mono">{labelAt(f.callLine)}</span>
          <span class="mono muted">{file}:{(f.callLine ?? 0) + 1} → 0x{hex(f.returnAddress)}</span>
        </li>
      {/each}
      <li class="bytes mono muted">
        {#each stackBytes as b (b.address)}<span>{hex(b.address)} {hex(b.value)}</span>{/each}
        <span>SP {hex(snap.registers.sp)}</span>
      </li>
    {:else}
      <li class="hint">Run or step a program to see its calls.</li>
    {/if}
  </ul>

  <SectionHeader title="Breakpoints" meta={String(bps.length)}>
    {#snippet actions()}
      <IconButton
        icon="plus"
        label="Add breakpoint on the cursor line"
        size="sm"
        onclick={() => app.toggleBreakpoint()}
      />
    {/snippet}
  </SectionHeader>
  <ul class="list">
    {#each bps as b (`${b.path}:${b.line}`)}
      {@const condError = b.condition ? Debugger.checkCondition(b.condition) : null}
      <li class="bp">
        <input
          type="checkbox"
          checked={b.enabled !== false}
          aria-label="Enable breakpoint {b.path}:{b.line + 1}"
          onchange={(e) => s.updateBreakpoint(b.path, b.line, { enabled: e.currentTarget.checked })}
        />
        <div class="bp-body">
          <button
            type="button"
            class="bp-title"
            onclick={async () => (await app.workspace.openFile(b.path), app.editor?.gotoLine(b.line))}
          >
            <span class="dot" class:off={b.enabled === false}></span>{b.path.split('/').pop()}:{b.line + 1}
          </button>
          <span class="mono muted code">{sourceLine(b.path, b.line)}</span>
          <label class="when">
            <span>when</span>
            <input
              class="mono"
              value={b.condition ?? ''}
              placeholder="A == 'H'"
              aria-label="Condition for line {b.line + 1}"
              onchange={(e) =>
                s.updateBreakpoint(b.path, b.line, { condition: e.currentTarget.value.trim() || undefined })}
            />
          </label>
          <label class="when">
            <span>hit</span>
            <input
              class="mono hits"
              type="number"
              min="1"
              value={b.hitCount ?? 1}
              aria-label="Pause from hit number"
              onchange={(e) =>
                s.updateBreakpoint(b.path, b.line, {
                  hitCount: Math.max(1, Number(e.currentTarget.value) || 1),
                })}
            />
            <span>×</span>
          </label>
          {#if condError}<span class="err">{condError}</span>{/if}
        </div>
        <IconButton
          icon="close"
          label="Remove breakpoint"
          size="sm"
          onclick={() => s.toggleBreakpoint(b.path, b.line)}
        />
      </li>
    {:else}
      <li class="hint">Click the gutter left of a line number, or press F9.</li>
    {/each}
  </ul>

  <label class="switch-row">
    <span>Pause on runtime faults</span>
    <Switch
      checked={app.settings.value.pauseOnFault}
      label="Pause on runtime faults"
      onchange={(v) => {
        app.settings.set('pauseOnFault', v);
        app.applySettings();
      }}
    />
  </label>
</section>

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 0 12px;
    overflow-y: auto;
    min-height: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 12px 10px 16px;
  }
  .state {
    flex: 1;
    font-weight: 500;
    color: var(--color-muted);
  }
  .state.paused {
    color: var(--color-warning);
  }
  .list {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 26px;
    padding: 0 8px 0 16px;
  }
  .expr {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .val {
    color: var(--color-accent);
    font-size: 12px;
  }
  .val.err {
    color: var(--color-negative);
    font-size: 11px;
  }
  .frame {
    justify-content: space-between;
  }
  .frame.current {
    background: var(--color-raised);
    box-shadow: inset 1px 0 var(--color-accent);
  }
  .muted {
    font-size: 11px;
  }
  .bytes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 6px 16px;
    font-size: 11px;
  }
  .hint {
    padding: 2px 16px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 1.4;
  }
  .add {
    padding: 0 16px 8px;
  }
  .bp {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 8px 6px 16px;
  }
  .bp input[type='checkbox'] {
    margin-top: 6px;
    accent-color: var(--color-text);
  }
  .bp-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .bp-title {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    text-align: left;
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
  .code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .when {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-muted);
    font-size: 12px;
  }
  .when input {
    width: 120px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--color-control);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 12px;
  }
  .when input.hits {
    width: 52px;
  }
  .err {
    color: var(--color-negative);
    font-size: 11px;
  }
  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
  }
</style>
