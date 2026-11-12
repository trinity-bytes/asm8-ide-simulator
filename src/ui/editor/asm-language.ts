import { HighlightStyle, StreamLanguage, syntaxHighlighting, type StringStream } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { MNEMONICS } from '@core/index';

const MNEMONIC_SET = new Set(MNEMONICS);
const REGISTERS = new Set(['A', 'B', 'C', 'D', 'SP']);

interface LineState {
  /** Token position in the line: a label or mnemonic may still come. */
  seenMnemonic: boolean;
}

/** Tokenizer for Asm8 assembly (same grammar the assembler accepts). */
export const asmLanguage = StreamLanguage.define<LineState>({
  name: 'asm8',
  startState: () => ({ seenMnemonic: false }),
  token(stream: StringStream, state: LineState): string | null {
    if (stream.sol()) state.seenMnemonic = false;
    if (stream.eatSpace()) return null;
    if (stream.peek() === ';') {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match(/^"[^"]*"?/) || stream.match(/^'[^']*'?/)) return 'string';
    if (stream.match(/^(0x[0-9a-f]+|0o[0-7]+|[01]+b|\d+d?)\b/i)) return 'number';
    if (stream.match(/^[[\],+-]/)) return 'punctuation';

    const word = stream.match(/^[.A-Za-z_]\w*/) as RegExpMatchArray | null;
    if (word) {
      const text = word[0];
      if (stream.peek() === ':') {
        stream.next();
        return 'labelName';
      }
      const upper = text.toUpperCase();
      if (!state.seenMnemonic && MNEMONIC_SET.has(upper)) {
        state.seenMnemonic = true;
        return 'keyword';
      }
      if (!state.seenMnemonic) {
        state.seenMnemonic = true;
        return 'invalid';
      }
      if (REGISTERS.has(upper)) return 'variableName.special';
      return 'variableName';
    }
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: ';' } },
});

/** Colours come from the theme tokens, so switching theme needs no editor reconfiguration. */
export const asmHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.comment, color: 'var(--syntax-comment)' },
    { tag: t.keyword, color: 'var(--syntax-keyword)' },
    { tag: t.labelName, color: 'var(--syntax-label)' },
    { tag: t.variableName, color: 'var(--syntax-label)' },
    { tag: t.special(t.variableName), color: 'var(--syntax-register)' },
    { tag: [t.number, t.string], color: 'var(--syntax-literal)' },
    { tag: t.punctuation, color: 'var(--color-text)' },
    { tag: t.invalid, color: 'var(--color-text)', textDecoration: 'underline wavy var(--color-negative)' },
  ]),
);
