<script lang="ts">
  import { tick } from 'svelte';
  import { hex } from '@core/index';
  import { i18n, t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';
  import type { ConsoleEntry } from '../../state/session.svelte';

  interface Props {
    /** Phone: keys typed anywhere in the view go to the program. */
    touch?: boolean;
  }
  let { touch = false }: Props = $props();

  const app = AppController.use();
  const s = app.session;
  const view = $derived(app.settings.value.consoleView);
  const wrap = $derived(app.settings.value.consoleWrap);
  let scroller: HTMLDivElement | null = $state(null);
  let stick = true;
  let input: HTMLInputElement | null = $state(null);

  const waiting = $derived(s.state === 'waiting');

  // Only the newest lines are in the DOM; older ones (up to the scrollback) load on request.
  // While a program runs fast, fewer rows keep each update cheap; all of them come back on pause.
  const PAGE = 1000;
  const LIVE = 200;
  let shown = $state(PAGE);
  const limit = $derived(s.running && s.speed === 'max' ? Math.min(shown, LIVE) : shown);
  const visible = $derived(s.console.length > limit ? s.console.slice(s.console.length - limit) : s.console);
  const hidden = $derived(s.console.length - visible.length);

  $effect(() => {
    void s.console.length;
    void s.console.at(-1)?.text;
    if (stick && scroller) void tick().then(() => scroller && (scroller.scrollTop = scroller.scrollHeight));
  });

  // Focus the input line when the program starts waiting for a key.
  $effect(() => {
    if (waiting && input && app.ui.panelTab === 'console') input.focus({ preventScroll: true });
  });

  function onscroll() {
    if (!scroller) return;
    stick = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 24;
  }

  const textOf = (e: ConsoleEntry) =>
    view === 'hex' && e.bytes ? e.bytes.map((b) => hex(b)).join(' ') : e.text;

  function onkey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let ch: string | null = null;
    if (e.key === 'Enter') ch = '\n';
    else if (e.key === 'Backspace') ch = '\b';
    // Tab is left alone so keyboard users can move on (no keyboard trap).
    else if (e.key === 'Escape') ch = '\x1b';
    else if (e.key.length === 1) ch = e.key;
    if (ch === null) return;
    e.preventDefault();
    s.sendInput(ch);
  }

  function onpaste(e: ClipboardEvent) {
    e.preventDefault();
    s.sendInput(e.clipboardData?.getData('text') ?? '');
  }

  function onbeforeinput(e: InputEvent) {
    // Mobile keyboards do not always send keydown with a key: take the inserted text instead.
    if (e.data) s.sendInput(e.data);
    e.preventDefault();
  }
</script>

<div class="console" class:touch>
  <!-- Scrollable output must be reachable by keyboard. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="log"
    class:nowrap={!wrap}
    bind:this={scroller}
    {onscroll}
    role="log"
    aria-live="polite"
    aria-label={t('panels.console.output')}
    tabindex="0"
  >
    {#if hidden > 0}
      <button type="button" class="earlier" onclick={() => (shown += PAGE)}>
        {t('panels.console.earlier', {
          count: Math.min(PAGE, hidden).toLocaleString(i18n.locale),
          hidden: hidden.toLocaleString(i18n.locale),
        })}
      </button>
    {/if}
    {#each visible as e (e.id)}
      <div class="entry {e.kind}" class:strong={e.kind === 'asm' && /^\d/.test(e.text)}>
        <span class="kind mono">{e.kind}</span>
        {#if e.line !== undefined}
          <button type="button" class="text mono link" onclick={() => app.revealLine(e.line!)}
            >{textOf(e)}</button
          >
        {:else}
          <span class="text mono"
            >{textOf(e)}{#if e.open && waiting}<span class="cursor" aria-hidden="true"></span>{/if}</span
          >
        {/if}
        {#if e.meta}<span class="meta mono">{e.meta}</span>{/if}
      </div>
    {:else}
      <p class="empty mono">
        {t('panels.console.empty')}
      </p>
    {/each}
    {#if waiting && !s.console.at(-1)?.open}
      <div class="entry tty">
        <span class="kind mono">tty</span><span class="text mono"
          ><span class="cursor" aria-hidden="true"></span></span
        ><span class="meta mono">{t('panels.console.waitingMeta')}</span>
      </div>
    {/if}
  </div>
  <label class="input" class:waiting>
    <span class="kind mono">in</span>
    <input
      bind:this={input}
      class="mono"
      value=""
      placeholder={waiting ? t('panels.console.placeholderWaiting') : t('panels.console.placeholder')}
      aria-label={t('panels.console.input')}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      onkeydown={onkey}
      {onpaste}
      {onbeforeinput}
    />
  </label>
</div>

<style>
  .console {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .log {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px 16px;
  }
  .log:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .entry {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 0 12px;
    align-items: start;
    min-height: 24px;
    padding: 3px 0;
    font-size: 13px;
    content-visibility: auto;
    contain-intrinsic-size: auto 24px;
  }
  .kind {
    color: var(--color-muted);
    font-size: 12px;
    line-height: 18px;
  }
  .text {
    line-height: 18px;
    white-space: pre-wrap;
    word-break: break-all;
    text-align: left;
  }
  .nowrap .text {
    white-space: pre;
    word-break: normal;
    overflow: hidden;
    mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent);
  }
  .asm .text,
  .run .text {
    color: var(--color-muted);
  }
  .strong .text {
    color: var(--color-text);
  }
  .out .text,
  .tty .text {
    color: var(--color-text);
    font-weight: 500;
  }
  .err .kind,
  .err .text {
    color: var(--color-negative);
  }
  .warn .kind,
  .warn .text {
    color: var(--color-warning);
  }
  .link {
    color: inherit;
  }
  .link:hover {
    text-decoration: underline;
  }
  .meta {
    color: var(--color-muted);
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
  }
  .cursor {
    display: inline-block;
    width: 8px;
    height: 15px;
    margin-left: 4px;
    vertical-align: -3px;
    background: var(--color-accent);
  }
  @media (prefers-reduced-motion: no-preference) {
    .cursor {
      animation: blink 1.1s steps(1) infinite;
    }
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .earlier {
    margin: 0 0 6px 60px;
    color: var(--color-accent);
    font-size: 12px;
  }
  .empty {
    margin: 4px 0;
    color: var(--color-muted);
    font-size: 13px;
  }
  .input {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 12px;
    align-items: center;
    height: 36px;
    margin: 0 16px;
    border-top: 1px solid var(--color-rule);
  }
  .input input {
    height: 100%;
    border: 0;
    background: transparent;
    font-size: 13px;
    caret-color: var(--color-accent);
  }
  .input input::placeholder {
    color: var(--color-muted);
  }
  .input input:focus-visible {
    box-shadow: none;
  }
  .input:focus-within {
    border-top-color: var(--color-accent);
    box-shadow: inset 0 1px var(--color-accent);
  }
  .waiting .kind {
    color: var(--color-accent);
  }
  .touch .input {
    height: 48px;
  }
</style>
