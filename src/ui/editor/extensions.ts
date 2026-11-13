import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { linter, lintGutter, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { EditorState, RangeSet, StateEffect, StateField, type Extension, type Text } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
  hoverTooltip,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import {
  findInstruction,
  formatByte,
  hex,
  INSTRUCTIONS,
  type Assembly,
  type NumberBase,
  type Registers,
} from '@core/index';
import { i18n, t, type MessageKey } from '../i18n/i18n.svelte';
import { instructionText } from '../i18n/instruction-docs.es';

// ---------------------------------------------------------------------------
// External data pushed into the editor by the Svelte component.
// ---------------------------------------------------------------------------

export interface RunMarker {
  /** 0-based line of the instruction at IP. */
  readonly line: number;
  readonly tone: 'paused' | 'error' | 'halted' | 'running';
  /** Short text drawn at the end of the line ("paused at breakpoint · step 8"). */
  readonly hint: string;
}

export interface EditorData {
  readonly assembly: Assembly | null;
  /** 0-based lines with a breakpoint, and whether each is enabled or has a condition. */
  readonly breakpoints: readonly { line: number; enabled: boolean; conditional: boolean }[];
  readonly marker: RunMarker | null;
  readonly registers: Registers | null;
  readonly base: NumberBase;
  readonly showAddresses: boolean;
  readonly inlineHints: boolean;
}

const EMPTY: EditorData = {
  assembly: null,
  breakpoints: [],
  marker: null,
  registers: null,
  base: 'hex',
  showAddresses: true,
  inlineHints: true,
};

export const setData = StateEffect.define<Partial<EditorData>>();

export const dataField = StateField.define<EditorData>({
  create: () => EMPTY,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setData)) value = { ...value, ...e.value };
    return value;
  },
});

// ---------------------------------------------------------------------------
// Gutters: breakpoint dot, then the byte address of each line.
// ---------------------------------------------------------------------------

class BreakpointMarker extends GutterMarker {
  constructor(
    readonly enabled: boolean,
    readonly conditional: boolean,
  ) {
    super();
  }
  override eq(other: BreakpointMarker) {
    return other.enabled === this.enabled && other.conditional === this.conditional;
  }
  override toDOM() {
    const el = document.createElement('span');
    el.className = `cm-bp${this.enabled ? '' : ' off'}${this.conditional ? ' cond' : ''}`;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }
}

class TextMarker extends GutterMarker {
  constructor(readonly text: string) {
    super();
  }
  override eq(other: TextMarker) {
    return other.text === this.text;
  }
  override toDOM() {
    return document.createTextNode(this.text);
  }
}

const lineAt = (doc: Text, pos: number) => doc.lineAt(pos).number - 1;

export function breakpointGutter(onToggle: (line: number) => void): Extension {
  return gutter({
    class: 'cm-bp-gutter',
    markers: (view) => {
      const { breakpoints } = view.state.field(dataField);
      const doc = view.state.doc;
      const ranges = breakpoints
        .filter((b) => b.line < doc.lines)
        .sort((a, b) => a.line - b.line)
        .map((b) => new BreakpointMarker(b.enabled, b.conditional).range(doc.line(b.line + 1).from));
      return RangeSet.of(ranges, true);
    },
    initialSpacer: () => new BreakpointMarker(true, false),
    domEventHandlers: {
      mousedown(view, block) {
        onToggle(lineAt(view.state.doc, block.from));
        return true;
      },
    },
  });
}

export const addressGutter: Extension = gutter({
  class: 'cm-address-gutter',
  lineMarker(view, block) {
    const data = view.state.field(dataField);
    if (!data.showAddresses || !data.assembly) return null;
    const address = data.assembly.lineToAddress.get(lineAt(view.state.doc, block.from));
    return address === undefined ? null : new TextMarker(`0x${hex(address)}`);
  },
  lineMarkerChange: (update) => update.transactions.some((tr) => tr.effects.some((e) => e.is(setData))),
  initialSpacer: () => new TextMarker('0x00'),
});

// ---------------------------------------------------------------------------
// Current line (paused / error / halted) with an inline hint.
// ---------------------------------------------------------------------------

class HintWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly tone: string,
  ) {
    super();
  }
  override eq(other: HintWidget) {
    return other.text === this.text && other.tone === this.tone;
  }
  override toDOM() {
    const el = document.createElement('span');
    el.className = `cm-run-hint ${this.tone}`;
    el.textContent = this.text;
    return el;
  }
}

export const runMarker = EditorView.decorations.compute([dataField, 'doc'], (state): DecorationSet => {
  const { marker, inlineHints } = state.field(dataField);
  if (!marker || marker.line >= state.doc.lines) return Decoration.none;
  const line = state.doc.line(marker.line + 1);
  const decos = [Decoration.line({ class: `cm-run-line ${marker.tone}` }).range(line.from)];
  if (inlineHints && marker.hint) {
    decos.push(
      Decoration.widget({ widget: new HintWidget(marker.hint, marker.tone), side: 1 }).range(line.to),
    );
  }
  return Decoration.set(decos);
});

// ---------------------------------------------------------------------------
// CodeMirror's own texts (search panel, lint panel, completion) in the current language.
// ---------------------------------------------------------------------------

const CM_PHRASES: Readonly<Record<string, MessageKey>> = {
  Find: 'state.cm.find',
  Replace: 'state.cm.replace',
  next: 'state.cm.next',
  previous: 'state.cm.previous',
  all: 'state.cm.all',
  'match case': 'state.cm.matchCase',
  regexp: 'state.cm.regexp',
  'by word': 'state.cm.byWord',
  replace: 'state.cm.replaceOne',
  'replace all': 'state.cm.replaceAll',
  close: 'state.cm.close',
  'Go to line': 'state.cm.goToLine',
  go: 'state.cm.go',
  'current match': 'state.cm.currentMatch',
  'on line': 'state.cm.onLine',
  'replaced match on line $': 'state.cm.replacedOne',
  'replaced $ matches': 'state.cm.replacedMany',
  Diagnostics: 'state.cm.diagnostics',
  'No diagnostics': 'state.cm.noDiagnostics',
  Completions: 'state.cm.completions',
  'Control character': 'state.cm.controlCharacter',
  'Selection deleted': 'state.cm.selectionDeleted',
};

/** `EditorState.phrases` for the current locale (none in English, CodeMirror's own default). */
export function editorPhrases(): Extension {
  if (i18n.locale === 'en') return [];
  return EditorState.phrases.of(Object.fromEntries(Object.entries(CM_PHRASES).map(([p, k]) => [p, t(k)])));
}

// ---------------------------------------------------------------------------
// Lint: assembler diagnostics with quick fixes.
// ---------------------------------------------------------------------------

export function asmLinter(): Extension {
  return [
    linter(
      (view): CmDiagnostic[] => {
        const { assembly } = view.state.field(dataField);
        if (!assembly) return [];
        const doc = view.state.doc;
        return assembly.diagnostics
          .filter((d) => d.line < doc.lines)
          .map((d) => {
            const line = doc.line(d.line + 1);
            const from = Math.min(line.from + d.from, line.to);
            const to = Math.max(from, Math.min(line.from + d.to, line.to));
            const fix = d.fix;
            return {
              from,
              to,
              severity: d.severity,
              message: d.message,
              ...(fix
                ? {
                    actions: [
                      {
                        name: fix.title,
                        apply: (v: EditorView, f: number, to: number) =>
                          v.dispatch({ changes: { from: f, to, insert: fix.replacement } }),
                      },
                    ],
                  }
                : {}),
            };
          });
      },
      {
        delay: 150,
        needsRefresh: (u) => u.transactions.some((tr) => tr.effects.some((e) => e.is(setData))),
      },
    ),
    lintGutter({ hoverTime: 200 }),
  ];
}

// ---------------------------------------------------------------------------
// Hovers: instruction docs, label address, live register value.
// ---------------------------------------------------------------------------

const el = (tag: string, cls: string, text?: string) => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function asmHover(onReference: (mnemonic: string) => void): Extension {
  return hoverTooltip(
    (view, pos) => {
      const { from, text } = view.state.doc.lineAt(pos);
      const code = text.split(';')[0] ?? '';
      const re = /[.A-Za-z_]\w*/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) {
        const start = from + m.index;
        const end = start + m[0].length;
        if (pos < start || pos > end) continue;
        const word = m[0];
        const data = view.state.field(dataField);
        const upper = word.toUpperCase();
        const isFirst =
          code
            .slice(0, m.index)
            .replace(/^[\s]*[.A-Za-z_]\w*:/, '')
            .trim() === '';

        // Instruction docs on the mnemonic.
        const doc = isFirst ? findInstruction(word) : undefined;
        if (doc) {
          return {
            pos: start,
            end,
            above: true,
            create: () => {
              const dom = el('div', 'cm-hover-card');
              const text = instructionText(doc, i18n.locale);
              const head = el('div', 'hc-head');
              head.append(el('span', 'hc-title mono', doc.mnemonic), el('span', 'hc-sub', text.summary));
              dom.append(head, el('p', 'hc-body', text.details));
              const forms = el('div', 'hc-forms mono');
              forms.textContent = doc.forms.map((f) => `${doc.mnemonic} ${f.operands}`.trim()).join('   ');
              dom.append(forms, el('p', 'hc-flags', t('state.editor.flags', { flags: text.flags })));
              const link = el('button', 'hc-link', t('state.editor.openReference')) as HTMLButtonElement;
              link.type = 'button';
              link.onclick = () => onReference(doc.mnemonic);
              dom.append(link);
              return { dom };
            },
          };
        }

        // Live register value while paused.
        if (['A', 'B', 'C', 'D', 'SP', 'IP'].includes(upper) && data.registers) {
          const r = data.registers;
          const v = upper === 'SP' ? r.sp : upper === 'IP' ? r.ip : r.gpr['ABCD'.indexOf(upper)]!;
          return {
            pos: start,
            end,
            above: true,
            create: () => {
              const dom = el('div', 'cm-hover-card small');
              const head = el('div', 'hc-head');
              head.append(
                el('span', 'hc-title mono', upper),
                el('span', 'hc-sub', t('state.editor.register')),
              );
              dom.append(
                head,
                el(
                  'div',
                  'hc-values mono',
                  `${formatByte(v, 'hex')}   ${v}   ${formatByte(v, 'bin')}${v >= 32 && v < 127 ? `   '${String.fromCharCode(v)}'` : ''}`,
                ),
              );
              return { dom };
            },
          };
        }

        // Label address.
        const address = data.assembly?.labels[word];
        if (address !== undefined) {
          return {
            pos: start,
            end,
            above: true,
            create: () => {
              const dom = el('div', 'cm-hover-card small');
              const head = el('div', 'hc-head');
              head.append(el('span', 'hc-title mono', word), el('span', 'hc-sub', t('state.editor.label')));
              dom.append(
                head,
                el(
                  'div',
                  'hc-values mono',
                  t('state.editor.address', { hex: `0x${hex(address)}`, dec: address }),
                ),
              );
              return { dom };
            },
          };
        }
        return null;
      }
      return null;
    },
    { hoverTime: 350 },
  );
}

// ---------------------------------------------------------------------------
// Autocomplete: mnemonics at the start, registers and labels after.
// ---------------------------------------------------------------------------

function completeAsm(ctx: CompletionContext): CompletionResult | null {
  const word = ctx.matchBefore(/[.A-Za-z_]\w*/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = line.text.slice(0, word.from - line.from);
  const code = before.split(';');
  if (code.length > 1) return null;
  const atMnemonic = before.replace(/^\s*[.A-Za-z_]\w*:/, '').trim() === '';
  if (atMnemonic) {
    return {
      from: word.from,
      options: INSTRUCTIONS.flatMap((i) =>
        [i.mnemonic, ...i.aliases].map((m) => ({
          label: m,
          detail: instructionText(i, i18n.locale).summary,
          type: 'keyword',
          apply: `${m} `,
        })),
      ),
      validFor: /^\w*$/,
    };
  }
  const { assembly } = ctx.state.field(dataField);
  const labels = Object.entries(assembly?.labels ?? {}).map(([name, address]) => ({
    label: name,
    detail: `0x${hex(address)}`,
    type: 'variable',
  }));
  const registers = ['A', 'B', 'C', 'D', 'SP'].map((r) => ({
    label: r,
    type: 'constant',
    detail: t('state.editor.register'),
  }));
  return { from: word.from, options: [...registers, ...labels], validFor: /^[.\w]*$/ };
}

export const asmCompletion = autocompletion({ override: [completeAsm], icons: false });
