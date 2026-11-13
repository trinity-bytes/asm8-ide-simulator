<script lang="ts">
  import { onDestroy } from 'svelte';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { bracketMatching, indentUnit } from '@codemirror/language';
  import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
  import { closeBrackets, completionKeymap } from '@codemirror/autocomplete';
  import { lintKeymap } from '@codemirror/lint';
  import { Compartment, EditorSelection, EditorState, type Extension } from '@codemirror/state';
  import {
    drawSelection,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
  } from '@codemirror/view';
  import { asmHighlight, asmLanguage } from './asm-language';
  import {
    addressGutter,
    asmCompletion,
    asmHover,
    asmLinter,
    breakpointGutter,
    dataField,
    editorPhrases,
    runMarker,
    setData,
    type EditorData,
  } from './extensions';
  import type { EditorBridge } from '../state/app.svelte';
  import { i18n } from '../i18n/i18n.svelte';

  interface Props {
    tabId: string;
    text: string;
    data: EditorData;
    tabSize: number;
    readOnly?: boolean;
    /** Phone: bigger gutter targets, no address column. */
    compact?: boolean;
    label: string;
    onchange: (text: string) => void;
    ontogglebreakpoint: (line: number) => void;
    /** Breakpoint lines after an edit moved them. */
    onbreakpointsmoved: (lines: number[]) => void;
    onreference: (mnemonic: string) => void;
    oncursor?: (line: number, col: number) => void;
    onready?: (bridge: EditorBridge | null) => void;
    onlinelongpress?: (line: number) => void;
  }
  let {
    tabId,
    text,
    data,
    tabSize,
    readOnly = false,
    compact = false,
    label,
    onchange,
    ontogglebreakpoint,
    onbreakpointsmoved,
    onreference,
    oncursor,
    onready,
    onlinelongpress,
  }: Props = $props();

  let host: HTMLDivElement | null = $state(null);
  let view: EditorView | null = null;
  /** One EditorState per tab keeps undo history and selection when switching tabs. */
  const states = new Map<string, EditorState>();
  let currentTab = '';
  const tabCompartment = new Compartment();
  const readOnlyCompartment = new Compartment();
  const phrasesCompartment = new Compartment();

  // Latest callbacks (props can change without recreating the view).
  const cb = {
    get onchange() {
      return onchange;
    },
    get toggle() {
      return ontogglebreakpoint;
    },
    get moved() {
      return onbreakpointsmoved;
    },
    get reference() {
      return onreference;
    },
    get cursor() {
      return oncursor;
    },
  };

  function extensions(): Extension[] {
    return [
      dataField,
      breakpointGutter((line) => cb.toggle(line)),
      lineNumbers({
        domEventHandlers: {
          mousedown(v, block, e) {
            if (!compact) return false;
            const line = v.state.doc.lineAt(block.from).number - 1;
            const started = Date.now();
            const target = e.target as HTMLElement;
            const up = () => {
              target.removeEventListener('pointerup', up);
              if (Date.now() - started < 450) cb.toggle(line);
              else onlinelongpress?.(line);
            };
            target.addEventListener('pointerup', up);
            return true;
          },
        },
      }),
      addressGutter,
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      rectangularSelection(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      asmLanguage,
      asmHighlight,
      runMarker,
      asmLinter(),
      asmHover((m) => cb.reference(m)),
      asmCompletion,
      tabCompartment.of([EditorState.tabSize.of(tabSize), indentUnit.of('\t')]),
      readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
      phrasesCompartment.of(editorPhrases()),
      keymap.of([
        ...completionKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...lintKeymap,
        ...defaultKeymap,
        indentWithTab,
      ]),
      EditorView.contentAttributes.of({
        'aria-label': label,
        spellcheck: 'false',
        autocapitalize: 'off',
        autocorrect: 'off',
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          // Keep breakpoints on the same instruction when lines are added or removed above them.
          const before = u.startState.field(dataField).breakpoints;
          if (before.length) {
            const moved = before
              .filter((b) => b.line < u.startState.doc.lines)
              .map(
                (b) =>
                  u.state.doc.lineAt(u.changes.mapPos(u.startState.doc.line(b.line + 1).from, 1)).number - 1,
              );
            if (moved.some((l, i) => l !== before[i]!.line)) cb.moved([...new Set(moved)]);
          }
          cb.onchange(u.state.doc.toString());
        }
        if (u.selectionSet || u.docChanged) {
          const head = u.state.selection.main.head;
          const line = u.state.doc.lineAt(head);
          cb.cursor?.(line.number, head - line.from + 1);
        }
      }),
    ];
  }

  function stateFor(id: string, doc: string): EditorState {
    const cached = states.get(id);
    if (cached && cached.doc.toString() === doc) return cached;
    if (cached) {
      // Text changed outside the editor (reload from disk): keep history, replace content.
      return cached.update({ changes: { from: 0, to: cached.doc.length, insert: doc } }).state;
    }
    return EditorState.create({ doc, extensions: extensions() });
  }

  const bridge: EditorBridge = {
    insert(snippet) {
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const prefix = from === line.from || line.text.trim() === '' ? '' : '\n';
      const insert = `${prefix}${snippet}`;
      view.dispatch({
        changes: { from, to, insert },
        selection: EditorSelection.cursor(from + insert.length),
      });
      view.focus();
    },
    gotoLine(n) {
      if (!view) return;
      const line = view.state.doc.line(Math.max(1, Math.min(n + 1, view.state.doc.lines)));
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
      view.focus();
    },
    focus() {
      view?.focus();
    },
    toggleBreakpointAtCursor() {
      if (view) cb.toggle(view.state.doc.lineAt(view.state.selection.main.head).number - 1);
    },
    cursorLine() {
      return view ? view.state.doc.lineAt(view.state.selection.main.head).number - 1 : 0;
    },
  };

  $effect(() => {
    if (!host || view) return;
    currentTab = tabId;
    view = new EditorView({ state: stateFor(tabId, text), parent: host });
    view.dispatch({ effects: setData.of(data) });
    onready?.(bridge);
  });

  // Tab switch or external text change.
  $effect(() => {
    const id = tabId;
    const doc = text;
    if (!view) return;
    if (id !== currentTab) {
      states.set(currentTab, view.state);
      currentTab = id;
      view.setState(stateFor(id, doc));
      view.dispatch({
        effects: [
          setData.of($state.snapshot(data) as EditorData),
          phrasesCompartment.reconfigure(editorPhrases()),
        ],
      });
    } else if (view.state.doc.toString() !== doc) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
    }
  });

  // Data from the session and settings.
  $effect(() => {
    const next = data;
    view?.dispatch({ effects: setData.of(next) });
  });

  $effect(() => {
    view?.dispatch({
      effects: [
        tabCompartment.reconfigure([EditorState.tabSize.of(tabSize), indentUnit.of('\t')]),
        readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
      ],
    });
  });

  // CodeMirror's own texts follow the language setting.
  $effect(() => {
    void i18n.locale;
    view?.dispatch({ effects: phrasesCompartment.reconfigure(editorPhrases()) });
  });

  // Keep the cursor on screen when the editor gets shorter (the phone keyboard opening).
  $effect(() => {
    if (!host) return;
    let last = host.clientHeight;
    const ro = new ResizeObserver(() => {
      const h = host?.clientHeight ?? 0;
      const shrank = h < last;
      last = h;
      if (!view || !shrank || !view.hasFocus) return;
      view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: 'nearest', yMargin: 24 }),
      });
    });
    ro.observe(host);
    return () => ro.disconnect();
  });

  // Reveal the current line when the run stops somewhere off-screen.
  $effect(() => {
    const m = data.marker;
    if (!view || !m || m.tone === 'running') return;
    const line = view.state.doc.line(Math.min(m.line + 1, view.state.doc.lines));
    view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'nearest', yMargin: 48 }) });
  });

  /** Forgets cached states of closed tabs. */
  export function forget(ids: Set<string>): void {
    for (const id of states.keys()) if (!ids.has(id)) states.delete(id);
  }

  onDestroy(() => {
    onready?.(null);
    view?.destroy();
    view = null;
  });
</script>

<div
  class="editor"
  class:compact
  class:no-addresses={!data.showAddresses}
  bind:this={host}
  id="editor-panel"
  role="tabpanel"
  aria-labelledby="tab-{tabId}"
></div>

<style>
  .editor {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
  .editor :global(.cm-editor) {
    height: 100%;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: var(--code-size);
  }
  .editor :global(.cm-editor.cm-focused) {
    outline: none;
  }
  /* A contenteditable always matches :focus-visible, so the global focus ring
     would frame the whole text area on every click. The caret and the active
     line already show focus. */
  .editor :global(.cm-content:focus-visible) {
    box-shadow: none;
  }
  .editor :global(.cm-scroller) {
    font-family: var(--font-mono);
    font-variant-ligatures: none;
    line-height: 18px;
    padding: 8px 0;
  }
  .editor :global(.cm-content) {
    caret-color: var(--color-text);
    padding-left: 12px;
  }
  .editor :global(.cm-cursor) {
    border-left: 2px solid var(--color-text);
  }
  .editor :global(.cm-gutters) {
    background: var(--color-surface);
    border: 0;
    color: var(--color-muted);
    font-size: 12px;
  }
  .editor :global(.cm-lineNumbers .cm-gutterElement) {
    min-width: 32px;
    padding: 0 8px 0 4px;
  }
  .editor :global(.cm-activeLineGutter) {
    background: transparent;
    color: var(--color-text);
  }
  .editor :global(.cm-activeLine) {
    background: color-mix(in srgb, var(--color-raised) 55%, transparent);
  }
  .editor :global(.cm-address-gutter .cm-gutterElement) {
    min-width: 46px;
    padding: 0 10px 0 6px;
    color: var(--color-muted);
  }
  .editor :global(.cm-bp-gutter) {
    cursor: pointer;
  }
  .editor :global(.cm-bp-gutter .cm-gutterElement) {
    display: grid;
    place-items: center;
    width: 22px;
  }
  .editor :global(.cm-bp-gutter .cm-gutterElement:hover::after) {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-negative) 40%, transparent);
  }
  .editor :global(.cm-bp) {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-negative);
  }
  .editor :global(.cm-bp.off) {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--color-muted);
  }
  .editor :global(.cm-bp.cond) {
    border-radius: 2px;
  }
  .editor :global(.cm-run-line.paused),
  .editor :global(.cm-run-line.running) {
    background: var(--tint-paused);
    box-shadow: inset 1px 0 var(--color-warning);
  }
  .editor :global(.cm-run-line.error) {
    background: var(--tint-error);
    box-shadow: inset 1px 0 var(--color-negative);
  }
  .editor :global(.cm-run-line.halted) {
    background: color-mix(in srgb, var(--color-raised) 80%, transparent);
    box-shadow: inset 1px 0 var(--color-accent);
  }
  .editor :global(.cm-run-hint) {
    margin-left: 2.5ch;
    font-size: 12px;
    color: var(--color-warning);
  }
  .editor :global(.cm-run-hint.error) {
    color: var(--color-negative);
  }
  .editor :global(.cm-run-hint.halted) {
    color: var(--color-muted);
  }
  .editor :global(.cm-selectionBackground),
  .editor :global(.cm-focused .cm-selectionBackground) {
    background: color-mix(in srgb, var(--color-accent) 30%, transparent) !important;
  }
  .editor :global(.cm-selectionMatch) {
    background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  }
  .editor :global(.cm-matchingBracket) {
    background: var(--color-raised);
    outline: 1px solid var(--color-control);
  }
  .editor :global(.cm-lintRange-error) {
    background-image: none;
    text-decoration: underline wavy var(--color-negative);
    text-underline-offset: 3px;
  }
  .editor :global(.cm-lintRange-warning) {
    background-image: none;
    text-decoration: underline wavy var(--color-warning);
    text-underline-offset: 3px;
  }
  .editor :global(.cm-gutter-lint) {
    width: 0;
  }
  .editor :global(.cm-gutter-lint .cm-gutterElement) {
    padding: 0;
  }
  .editor :global(.cm-lint-marker) {
    display: none;
  }
  /* Tooltips: hover cards, lint messages, completion. */
  .editor :global(.cm-tooltip) {
    border: 0;
    border-radius: 8px;
    background: var(--color-raised);
    color: var(--color-text);
    box-shadow: var(--shadow-pop);
    font-family: var(--font-ui);
    font-size: 13px;
    overflow: hidden;
  }
  .editor :global(.cm-tooltip-lint) {
    padding: 0;
  }
  .editor :global(.cm-diagnostic) {
    padding: 8px 12px;
    border-left: 2px solid var(--color-negative);
  }
  .editor :global(.cm-diagnostic-warning) {
    border-left-color: var(--color-warning);
  }
  .editor :global(.cm-diagnosticAction) {
    margin-left: 10px;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--color-text);
    color: var(--color-surface);
    font: 500 12px var(--font-ui);
  }
  .editor :global(.cm-hover-card) {
    width: 340px;
    padding: 12px 14px;
  }
  .editor :global(.cm-hover-card.small) {
    width: auto;
    min-width: 200px;
  }
  .editor :global(.hc-head) {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }
  .editor :global(.hc-title) {
    font-size: 14px;
    font-weight: 500;
  }
  .editor :global(.hc-sub),
  .editor :global(.hc-flags) {
    color: var(--color-muted);
    font-size: 12px;
  }
  .editor :global(.hc-body) {
    margin: 4px 0 8px;
    line-height: 1.45;
  }
  .editor :global(.hc-forms),
  .editor :global(.hc-values) {
    font-size: 12px;
    color: var(--syntax-literal);
    white-space: pre-wrap;
  }
  .editor :global(.hc-flags) {
    margin: 8px 0 0;
  }
  .editor :global(.hc-link) {
    margin-top: 8px;
    color: var(--color-accent);
    font-size: 12px;
  }
  .editor :global(.cm-tooltip-autocomplete ul li) {
    padding: 3px 10px;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .editor :global(.cm-tooltip-autocomplete ul li[aria-selected]) {
    background: var(--color-control);
    color: var(--color-text);
  }
  .editor :global(.cm-completionDetail) {
    margin-left: 12px;
    color: var(--color-muted);
    font-family: var(--font-ui);
    font-style: normal;
  }
  .editor :global(.cm-panels) {
    background: var(--color-raised);
    color: var(--color-text);
    border-color: var(--color-rule);
  }
  .editor :global(.cm-panel.cm-search input),
  .editor :global(.cm-panel.cm-search button) {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-control);
    border-radius: 4px;
    background-image: none;
  }
  /* CodeMirror styles gutters with display: flex !important. */
  .no-addresses :global(.cm-address-gutter) {
    display: none !important;
  }
  .compact :global(.cm-lineNumbers .cm-gutterElement) {
    min-width: 40px;
  }
  .compact :global(.cm-bp-gutter .cm-gutterElement) {
    width: 14px;
  }
  .compact :global(.cm-scroller) {
    line-height: 22px;
  }
</style>
