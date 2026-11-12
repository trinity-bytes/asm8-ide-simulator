<script lang="ts">
  import {
    bin,
    charOf,
    describeStack,
    DISPLAY_START,
    formatByte,
    hex,
    MAX_SP,
    MEMORY_SIZE,
    type NumberBase,
  } from '@core/index';
  import Button from '../atoms/Button.svelte';
  import Segmented from '../atoms/Segmented.svelte';
  import FlagCell from '../molecules/FlagCell.svelte';
  import RegisterRow from '../molecules/RegisterRow.svelte';
  import { AppController } from '../state/app.svelte';
  import type { RegisterKey } from '../state/session.svelte';

  interface Props {
    /** Inside a tab (tablet portrait, phone): no outer title. */
    embedded?: boolean;
  }
  let { embedded = false }: Props = $props();

  const app = AppController.use();
  const s = app.session;
  const base = $derived(app.settings.value.numberBase);
  const markChanges = $derived(app.settings.value.markChanges);
  const snap = $derived(s.snapshot);
  // Before the first run, preview where the current program will land in memory.
  const mem = $derived.by(() => {
    if (snap) return snap.memory;
    const preview = new Uint8Array(MEMORY_SIZE);
    const code = app.activeAssembly?.ok ? app.activeAssembly.code : [];
    preview.set(code.slice(0, MEMORY_SIZE));
    return preview;
  });
  const regs = $derived(
    snap?.registers ?? { gpr: [0, 0, 0, 0], sp: MAX_SP, ip: 0, zero: false, carry: false, fault: false },
  );
  const assembly = $derived(s.program?.assembly ?? app.activeAssembly);
  const codeSize = $derived(assembly?.code.length ?? 0);
  const stackSize = $derived(MAX_SP - regs.sp);

  const BASES: { value: NumberBase; label: string }[] = [
    { value: 'hex', label: 'Hex' },
    { value: 'dec', label: 'Dec' },
    { value: 'bin', label: 'Bin' },
  ];

  const fmt = (v: number, b: NumberBase) =>
    b === 'bin' ? `${bin(v).slice(0, 4)} ${bin(v).slice(4)}` : formatByte(v, b);

  function pointsTo(key: RegisterKey, v: number): string {
    if (key === 'IP') {
      const line = assembly?.addressToLine.get(v);
      return line !== undefined ? `line ${line + 1}` : '';
    }
    if (key === 'SP') return stackSize === 0 ? 'stack empty' : `${stackSize} on stack`;
    if (v >= DISPLAY_START) return `0x${hex(v)}  display`;
    const label = Object.entries(assembly?.labels ?? {}).find(([, a]) => a === v)?.[0];
    const cell = mem[v] ?? 0;
    if (label) return `${label}  '${charOf(cell)}'`;
    if (v >= 32 && v < 127) return `'${String.fromCharCode(v)}'`;
    return v === 0 ? '—' : `0x${hex(v)}  ${hex(cell)}`;
  }

  const rows = $derived(
    (['A', 'B', 'C', 'D', 'IP', 'SP'] as RegisterKey[]).map((key) => {
      const v = key === 'IP' ? regs.ip : key === 'SP' ? regs.sp : regs.gpr['ABCD'.indexOf(key)]!;
      const changed = markChanges && s.changedNow.includes(key) && key !== 'IP';
      return {
        key,
        value: fmt(v, base),
        second: base === 'dec' ? `0x${hex(v)}` : base === 'bin' ? `0x${hex(v)}` : String(v),
        note: base === 'bin' ? (s.changedAt[key] ? `step ${s.changedAt[key]}` : '') : pointsTo(key, v),
        changed,
      };
    }),
  );

  const stack = $derived(
    snap ? describeStack(snap.memory, regs.sp, s.program?.assembly ?? null, s.writes).slice(0, 8) : [],
  );

  // Memory cell popover.
  let selected = $state<number | null>(null);
  let editValue = $state('');
  const canEdit = $derived(!s.running && s.state !== 'empty');

  function cellClass(i: number): string {
    const c: string[] = [];
    if (i === regs.ip && snap) c.push('ip');
    if (i === regs.sp && snap) c.push('sp');
    if ((mem[i] ?? 0) === 0) c.push('zero');
    if (markChanges && s.touched.has(i)) c.push('touched');
    if (i >= DISPLAY_START) c.push('disp');
    if (selected === i) c.push('sel');
    return c.join(' ');
  }

  /** Hex byte, or the character on the display rows (· when empty). */
  function cellText(i: number): string {
    const v = mem[i] ?? 0;
    if (i >= DISPLAY_START) return v >= 32 && v < 127 ? String.fromCharCode(v) : v === 0 ? '·' : hex(v);
    return hex(v);
  }

  function select(i: number) {
    selected = selected === i ? null : i;
    editValue = `0x${hex(mem[i] ?? 0)}`;
  }

  function commitEdit() {
    if (selected === null) return;
    const raw = editValue.trim().toLowerCase();
    const v = raw.startsWith('0x')
      ? parseInt(raw.slice(2), 16)
      : raw.endsWith('b')
        ? parseInt(raw, 2)
        : parseInt(raw, 10);
    if (Number.isNaN(v) || v < 0 || v > 255) {
      app.ui.toast('Enter a byte: 0–255, 0x00–0xFF or 01010101b', 'negative');
      return;
    }
    s.poke(selected, v);
  }

  function gridKey(e: KeyboardEvent, i: number) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 16, ArrowUp: -16 };
    const d = moves[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const next = (i + d + MEMORY_SIZE) % MEMORY_SIZE;
    (e.currentTarget as HTMLElement).parentElement?.parentElement
      ?.querySelector<HTMLElement>(`[data-addr="${next}"]`)
      ?.focus();
  }
</script>

<section class="machine" class:embedded aria-label="Machine">
  <header class="head">
    {#if !embedded}<h2>Machine</h2>{/if}
    <Segmented
      look="tabs"
      label="Number base"
      value={base}
      options={BASES}
      onchange={(v) => app.settings.set('numberBase', v)}
    />
  </header>

  <div class="card regs" role="group" aria-label="Registers">
    <div class="cols">
      <span>Register</span><span>Value</span><span class="r">{base === 'hex' ? 'Dec' : 'Hex'}</span><span
        class="r">{base === 'bin' ? 'Changed' : 'Points to'}</span
      >
    </div>
    {#each rows as r (r.key)}
      <RegisterRow name={r.key} value={r.value} second={r.second} note={r.note} changed={r.changed} />
    {/each}
  </div>

  <div class="card flags" role="group" aria-label="Flags">
    <FlagCell name="Zero" on={regs.zero} />
    <FlagCell name="Carry" on={regs.carry} />
    <FlagCell name="Fault" on={regs.fault} />
  </div>

  {#if stack.length}
    <div class="card stack" role="group" aria-label="Stack">
      <div class="card-head">
        <span>Stack</span><span class="muted mono"
          >{stackSize} byte{stackSize === 1 ? '' : 's'} · SP 0x{hex(regs.sp)}</span
        >
      </div>
      {#each stack as e (e.address)}
        <div class="srow mono">
          <span class="muted">0x{hex(e.address)}</span>
          <span>{fmt(e.value, base)}</span>
          <span class="who">{e.returnTo !== undefined ? `return to 0x${hex(e.returnTo)}` : 'pushed'}</span>
          <span class="muted r">{e.pushedBy !== undefined ? `line ${e.pushedBy + 1}` : ''}</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="card memory" role="group" aria-label="Memory">
    <div class="card-head"><span>Memory</span><span class="muted">{MEMORY_SIZE} bytes</span></div>
    <div class="bar" aria-hidden="true">
      <span class="code" style:width="{(codeSize / MEMORY_SIZE) * 100}%"></span>
      <span class="free"></span>
      <span class="stk" style:width="{(stackSize / MEMORY_SIZE) * 100}%"></span>
      <span class="disp" style:width="{((MEMORY_SIZE - DISPLAY_START) / MEMORY_SIZE) * 100}%"></span>
    </div>
    <div class="legend mono">
      <span><i class="code"></i>Code {codeSize} B</span>
      <span><i class="stk"></i>Stack 0x{hex(regs.sp)}</span>
      <span><i class="disp"></i>Display 24 B</span>
    </div>
    <div class="grid mono" role="grid" aria-label="Memory bytes, 16 per row" aria-rowcount={16}>
      <div class="gh" role="row">
        <span></span>
        {#each Array(16) as _, c (c)}<span role="columnheader">{c.toString(16).toUpperCase()}</span>{/each}
      </div>
      {#each Array(16) as _, row (row)}
        <div class="gr" role="row">
          <span class="addr" role="rowheader">{hex(row * 16)}</span>
          {#each Array(16) as _, col (col)}
            {@const i = row * 16 + col}
            <button
              type="button"
              role="gridcell"
              data-addr={i}
              class={cellClass(i)}
              tabindex={i === (selected ?? 0) ? 0 : -1}
              aria-label="{cellText(i)}, address 0x{hex(i)}{i === regs.ip ? ', IP' : ''}{i === regs.sp
                ? ', SP'
                : ''}"
              onclick={() => select(i)}
              onkeydown={(e) => gridKey(e, i)}
            >
              {cellText(i)}
            </button>
          {/each}
        </div>
      {/each}
    </div>
    <p class="key mono">
      <span>Blue outline · IP 0x{hex(regs.ip)}</span><span>Dashed · SP 0x{hex(regs.sp)}</span>
    </p>

    {#if selected !== null}
      {@const v = mem[selected] ?? 0}
      <div class="pop" role="dialog" aria-label="Memory cell 0x{hex(selected)}">
        <div class="pop-head">
          <strong class="mono">0x{hex(selected)}</strong>
          <span class="muted"
            >{selected >= DISPLAY_START
              ? 'display'
              : selected <= MAX_SP && selected > regs.sp
                ? 'stack'
                : selected < codeSize
                  ? 'program'
                  : 'free'}</span
          >
          <button type="button" class="x" aria-label="Close" onclick={() => (selected = null)}>×</button>
        </div>
        <dl class="mono">
          <dt>Hex</dt>
          <dd>0x{hex(v)}</dd>
          <dt>Dec</dt>
          <dd>{v}</dd>
          <dt>Bin</dt>
          <dd>{bin(v)}</dd>
          <dt>Char</dt>
          <dd>{v >= 32 && v < 127 ? `'${String.fromCharCode(v)}'` : '—'}</dd>
        </dl>
        {#if canEdit}
          <form
            class="edit"
            onsubmit={(e) => {
              e.preventDefault();
              commitEdit();
            }}
          >
            <input class="mono" bind:value={editValue} aria-label="New value for 0x{hex(selected)}" />
            <Button size="sm" type="submit">Set</Button>
          </form>
        {:else}
          <p class="muted small">Pause the program to edit memory.</p>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .machine {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    padding: 12px 16px 16px;
    overflow-y: auto;
    background: var(--color-ground);
  }
  .embedded {
    background: var(--color-surface);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
  }
  .embedded .head {
    justify-content: flex-end;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  .card {
    position: relative;
    border-radius: 6px;
    background: var(--color-surface);
    padding: 8px 0;
  }
  .embedded .card {
    background: var(--color-ground);
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1.2fr 0.8fr 1.6fr;
    padding: 6px 12px;
    color: var(--color-muted);
    font-size: 12px;
  }
  .r {
    text-align: right;
  }
  .flags {
    display: flex;
    padding: 0;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    padding: 4px 12px 8px;
    font-weight: 600;
  }
  .card-head .muted {
    font-weight: 400;
    font-size: 12px;
  }
  .muted {
    color: var(--color-muted);
  }
  .srow {
    display: grid;
    grid-template-columns: 44px 80px 1fr auto;
    gap: 8px;
    padding: 3px 12px;
    font-size: 12px;
    border-top: 1px solid var(--color-rule);
  }
  .who {
    font-family: var(--font-ui);
  }
  .bar {
    display: flex;
    height: 6px;
    margin: 0 12px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--color-raised);
  }
  .bar .free {
    flex: 1;
  }
  .code {
    background: var(--color-accent);
  }
  .stk {
    background: var(--color-text);
  }
  .bar .disp,
  .legend .disp {
    background: var(--color-muted);
  }
  .legend {
    display: flex;
    gap: 16px;
    padding: 8px 12px;
    font-size: 11px;
    color: var(--color-muted);
  }
  .legend i {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 6px;
  }
  .grid {
    padding: 4px 12px 0;
    font-size: 11px;
  }
  .gh,
  .gr {
    display: grid;
    grid-template-columns: 22px repeat(16, minmax(0, 1fr));
    align-items: center;
  }
  .gh span {
    text-align: center;
    color: var(--color-muted);
    height: 18px;
  }
  .addr {
    color: var(--color-muted);
  }
  .gr button {
    height: 18px;
    font-size: 11px;
    text-align: center;
    color: var(--color-text);
    border-radius: 2px;
    outline-offset: -1px;
  }
  .gr button:hover {
    background: var(--color-raised);
  }
  .gr button.zero {
    color: var(--color-muted);
  }
  .gr button.disp {
    background: color-mix(in srgb, var(--color-raised) 70%, transparent);
  }
  .gr button.touched {
    color: var(--color-accent);
  }
  .gr button.ip {
    outline: 1px solid var(--color-accent);
  }
  .gr button.sp {
    outline: 1px dashed var(--color-text);
  }
  .gr button.sel {
    background: var(--color-control);
  }
  .gr button:focus-visible {
    box-shadow: var(--focus-ring);
  }
  .key {
    display: flex;
    gap: 16px;
    margin: 8px 12px 4px;
    font-size: 11px;
    color: var(--color-muted);
  }
  .pop {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 36px;
    z-index: 5;
    padding: 12px;
    border-radius: 8px;
    background: var(--color-raised);
    box-shadow: var(--shadow-pop);
  }
  .pop-head {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .x {
    margin-left: auto;
    width: 24px;
    height: 24px;
    color: var(--color-muted);
    font-size: 18px;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr auto 1fr;
    gap: 4px 12px;
    margin: 8px 0;
    font-size: 12px;
  }
  dt {
    color: var(--color-muted);
  }
  dd {
    margin: 0;
  }
  .edit {
    display: flex;
    gap: 8px;
  }
  .edit input {
    flex: 1;
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--color-control);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .small {
    margin: 0;
    font-size: 12px;
  }
</style>
