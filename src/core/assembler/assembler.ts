import { MEMORY_SIZE } from '../machine/layout';
import { ENCODINGS, MNEMONICS } from './encodings';
import { AsmError, parseOperand, type Operand } from './operands';
import { closest } from './suggest';

export type Severity = 'error' | 'warning';

/** A problem found while assembling. Lines and columns are 0-based. */
export interface Diagnostic {
  readonly line: number;
  readonly from: number;
  readonly to: number;
  readonly severity: Severity;
  readonly message: string;
  /** Optional one-click repair: replace `from..to` on `line` with `replacement`. */
  readonly fix?: { readonly title: string; readonly replacement: string };
}

export interface Assembly {
  /** Program bytes, ready to copy into memory from address 0. */
  readonly code: readonly number[];
  /** Address of the first byte of each instruction → source line. `DB` data has no entry. */
  readonly addressToLine: ReadonlyMap<number, number>;
  /** Source line → address of its instruction (or of its data for `DB`). */
  readonly lineToAddress: ReadonlyMap<number, number>;
  /** Label → address, case as written. */
  readonly labels: Readonly<Record<string, number>>;
  readonly diagnostics: readonly Diagnostic[];
  /** True when there is no error (warnings allowed). */
  readonly ok: boolean;
}

// label: INSTRUCTION operand1, operand2 — same grammar as the legacy simulator.
const LINE =
  /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|".+?"|'.+?'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|".+?"|'.+?'|[.A-Za-z0-9]\w*))?)?)?/;
const OP1 = 3;
const OP2 = 7;
const KEYWORD_LABELS = new Set(['A', 'B', 'C', 'D']);

interface PendingLabel {
  readonly name: string;
  readonly line: number;
  readonly from: number;
  readonly to: number;
}

/** Index of the first non-blank character, or the end of the line. */
const firstChar = (text: string): number => text.length - text.trimStart().length;

/** End of the code part of a line (before a `;` comment that is not inside quotes). */
function codeEnd(text: string): number {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ';') return text.slice(0, i).trimEnd().length;
  }
  return text.trimEnd().length;
}

/**
 * Translates assembly source into machine code. Unlike the legacy simulator it does not stop at
 * the first error: every line is checked so the editor can show all problems at once.
 */
export function assemble(source: string): Assembly {
  const lines = source.split('\n');
  const code: (number | string)[] = [];
  const codeLine: number[] = [];
  const addressToLine = new Map<number, number>();
  const lineToAddress = new Map<number, number>();
  const labels: Record<string, number> = {};
  const labelDefs = new Map<string, PendingLabel>();
  const diagnostics: Diagnostic[] = [];
  let overflowReported = false;

  const emit = (line: number, ...bytes: (number | string)[]) => {
    for (const b of bytes) {
      code.push(b);
      codeLine.push(line);
    }
  };

  lines.forEach((text, line) => {
    const start = firstChar(text);
    const end = Math.max(codeEnd(text), start);
    const errorAt = (message: string, from = start, to = end, fix?: Diagnostic['fix']) =>
      diagnostics.push({ line, from, to, severity: 'error', message, ...(fix ? { fix } : {}) });

    const match = LINE.exec(text);
    const label = match?.[1];
    const mnemonic = match?.[2];

    if (!match || (label === undefined && mnemonic === undefined)) {
      const trimmed = text.trim();
      if (trimmed !== '' && !trimmed.startsWith(';')) errorAt('Syntax error');
      return;
    }

    try {
      if (label !== undefined) {
        const upper = label.toUpperCase();
        const from = text.indexOf(label);
        if (KEYWORD_LABELS.has(upper)) throw new AsmError(`Label contains keyword: ${upper}`);
        const previous = [...labelDefs.values()].find((l) => l.name.toUpperCase() === upper);
        if (previous) throw new AsmError(`Duplicate label: ${label}`);
        labels[label] = code.length;
        labelDefs.set(label, { name: label, line, from, to: from + label.length });
      }

      if (mnemonic !== undefined) {
        const instr = mnemonic.toUpperCase();
        const op1 = match[OP1];
        const op2 = match[OP2];
        const address = code.length;
        const mnemonicFrom = text.indexOf(mnemonic, label !== undefined ? text.indexOf(':') + 1 : 0);

        if (instr === 'DB') {
          if (op1 === undefined) throw new AsmError('DB: missing operand');
          const p = parseOperand(op1);
          if (p.kind === 'number') emit(line, p.value);
          else if (p.kind === 'numbers') emit(line, ...p.value);
          else throw new AsmError('DB does not support this operand');
          lineToAddress.set(line, address);
        } else {
          const enc = ENCODINGS[instr];
          if (!enc) {
            const guess = closest(instr, MNEMONICS);
            errorAt(
              `Invalid instruction: ${mnemonic}`,
              mnemonicFrom,
              mnemonicFrom + mnemonic.length,
              guess ? { title: `Did you mean ${guess}?`, replacement: guess } : undefined,
            );
            return;
          }

          addressToLine.set(address, line);
          lineToAddress.set(line, address);

          const operands: Operand[] = [];
          if (enc.arity === 0) {
            if (op1 !== undefined) throw new AsmError(`${instr}: too many arguments`);
          } else {
            if (op1 === undefined) throw new AsmError(`${instr}: missing operand`);
            operands.push(parseOperand(op1));
            if (enc.arity === 1 && op2 !== undefined) throw new AsmError(`${instr}: too many arguments`);
            if (enc.arity === 2) {
              if (op2 === undefined) throw new AsmError(`${instr}: missing operand`);
              operands.push(parseOperand(op2));
            }
          }

          const signature = operands.map((o) => o.kind).join(',');
          const opcode = enc.forms[signature];
          if (opcode === undefined) {
            throw new AsmError(`${instr} does not support this operand${enc.arity === 2 ? 's' : ''}`);
          }
          emit(line, opcode, ...operands.map((o) => o.value as number | string));
        }
      }

      {
        const rest = text.slice(match[0].length, end).trim();
        if (rest !== '') {
          const from = text.indexOf(rest, match[0].length);
          diagnostics.push({
            line,
            from,
            to: from + rest.length,
            severity: 'warning',
            message: `Unexpected text after instruction: ${rest}`,
          });
        }
      }
    } catch (e) {
      if (e instanceof AsmError) errorAt(e.message);
      else throw e;
    }

    if (!overflowReported && code.length > MEMORY_SIZE) {
      overflowReported = true;
      errorAt(`Binary code does not fit into the memory. Max ${MEMORY_SIZE} bytes are allowed`);
    }
  });

  // Resolve labels.
  const used = new Set<string>();
  const bytes = code.map((value, i) => {
    if (typeof value === 'number') return value;
    if (value in labels) {
      used.add(value);
      return labels[value]!;
    }
    const line = codeLine[i]!;
    const text = lines[line] ?? '';
    const from = Math.max(0, text.indexOf(value));
    diagnostics.push({
      line,
      from,
      to: from + value.length,
      severity: 'error',
      message: `Undefined label: ${value}`,
    });
    return 0;
  });

  for (const def of labelDefs.values()) {
    if (!used.has(def.name)) {
      diagnostics.push({
        line: def.line,
        from: def.from,
        to: def.to,
        severity: 'warning',
        message: `Label "${def.name}" is never used`,
      });
    }
  }

  diagnostics.sort((a, b) => a.line - b.line || a.from - b.from);
  const ok = !diagnostics.some((d) => d.severity === 'error');
  return { code: bytes, addressToLine, lineToAddress, labels, diagnostics, ok };
}
