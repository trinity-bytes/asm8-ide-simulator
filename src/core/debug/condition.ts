/**
 * Breakpoint conditions: a tiny, safe expression language (no eval).
 *
 *   A == 0x41        C > 5 && Z        [0xE8] != 0        [C] == 'H'        !C || SP < 0xE0
 *
 * Operands: registers A B C D SP IP, flags Z C… (written `Z`, `CF` for carry because `C` is a
 * register), numbers in the assembler formats (12, 0x0C, 1100b, 0o14), characters ('H') and memory
 * reads `[expr]`. Operators: ! unary, * / %, + -, < <= > >=, == !=, &&, ||, parentheses.
 */

export interface ConditionContext {
  register(name: 'A' | 'B' | 'C' | 'D' | 'SP' | 'IP'): number;
  flag(name: 'Z' | 'CF'): boolean;
  memory(address: number): number;
}

export type Condition = (ctx: ConditionContext) => number;

export class ConditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConditionError';
  }
}

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const OPS = ['&&', '||', '==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/', '%', '!', '(', ')', '[', ']'];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "'") {
      const end = src.indexOf("'", i + 1);
      if (end !== i + 2) throw new ConditionError("A character must look like 'H'");
      tokens.push({ t: 'num', v: src.charCodeAt(i + 1) });
      i = end + 1;
      continue;
    }
    const word = /^[A-Za-z0-9_]+/.exec(src.slice(i))?.[0];
    if (word) {
      tokens.push(
        /^[0-9]/.test(word) ? { t: 'num', v: parseLiteral(word) } : { t: 'id', v: word.toUpperCase() },
      );
      i += word.length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ConditionError(`Unexpected "${ch}"`);
    tokens.push({ t: 'op', v: op });
    i += op.length;
  }
  return tokens;
}

function parseLiteral(word: string): number {
  const lower = word.toLowerCase();
  let n: number;
  if (lower.startsWith('0x')) n = parseInt(lower.slice(2), 16);
  else if (lower.startsWith('0o')) n = parseInt(lower.slice(2), 8);
  else if (/^[01]+b$/.test(lower)) n = parseInt(lower.slice(0, -1), 2);
  else if (/^\d+d?$/.test(lower)) n = parseInt(lower, 10);
  else n = NaN;
  if (Number.isNaN(n)) throw new ConditionError(`Not a number: ${word}`);
  return n;
}

const BINARY: Record<string, [number, (a: number, b: number) => number]> = {
  '||': [1, (a, b) => +(a !== 0 || b !== 0)],
  '&&': [2, (a, b) => +(a !== 0 && b !== 0)],
  '==': [3, (a, b) => +(a === b)],
  '!=': [3, (a, b) => +(a !== b)],
  '<': [4, (a, b) => +(a < b)],
  '<=': [4, (a, b) => +(a <= b)],
  '>': [4, (a, b) => +(a > b)],
  '>=': [4, (a, b) => +(a >= b)],
  '+': [5, (a, b) => a + b],
  '-': [5, (a, b) => a - b],
  '*': [6, (a, b) => a * b],
  '/': [6, (a, b) => (b === 0 ? 0 : Math.floor(a / b))],
  '%': [6, (a, b) => (b === 0 ? 0 : a % b)],
};

const REGISTERS = new Set(['A', 'B', 'C', 'D', 'SP', 'IP']);

/** Compiles a condition once; the result is cheap to evaluate on every hit. */
export function compileCondition(src: string): Condition {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const expectOp = (v: string) => {
    const tok = tokens[pos++];
    if (!tok || tok.t !== 'op' || tok.v !== v) throw new ConditionError(`Expected "${v}"`);
  };

  const primary = (): Condition => {
    const tok = tokens[pos++];
    if (!tok) throw new ConditionError('Condition is incomplete');
    if (tok.t === 'num') return () => tok.v;
    if (tok.t === 'id') {
      const name = tok.v;
      if (REGISTERS.has(name)) return (ctx) => ctx.register(name as 'A');
      if (name === 'Z' || name === 'CF') return (ctx) => +ctx.flag(name);
      throw new ConditionError(`Unknown name: ${name}`);
    }
    if (tok.v === '(') {
      const inner = expr(0);
      expectOp(')');
      return inner;
    }
    if (tok.v === '[') {
      const address = expr(0);
      expectOp(']');
      return (ctx) => ctx.memory(address(ctx));
    }
    if (tok.v === '!') {
      const operand = primary();
      return (ctx) => +(operand(ctx) === 0);
    }
    if (tok.v === '-') {
      const operand = primary();
      return (ctx) => -operand(ctx);
    }
    throw new ConditionError(`Unexpected "${tok.v}"`);
  };

  const expr = (minPrec: number): Condition => {
    let left = primary();
    for (;;) {
      const tok = peek();
      if (!tok || tok.t !== 'op') break;
      const entry = BINARY[tok.v];
      if (!entry || entry[0] <= minPrec) break;
      pos++;
      const right = expr(entry[0]);
      const l = left;
      const fn = entry[1];
      left = (ctx) => fn(l(ctx), right(ctx));
    }
    return left;
  };

  if (tokens.length === 0) throw new ConditionError('Condition is empty');
  const result = expr(0);
  if (pos < tokens.length) throw new ConditionError(`Unexpected "${(tokens[pos] as Token).v}"`);
  return result;
}

/** Evaluates an expression (watch list, hover) against registers and memory. */
export function evaluate(
  src: string,
  registers: { gpr: readonly number[]; sp: number; ip: number; zero: boolean; carry: boolean },
  memory: Uint8Array,
): { value: number } | { error: string } {
  try {
    const fn = compileCondition(src);
    const value = fn({
      register: (name) =>
        name === 'SP' ? registers.sp : name === 'IP' ? registers.ip : registers.gpr['ABCD'.indexOf(name)]!,
      flag: (name) => (name === 'Z' ? registers.zero : registers.carry),
      memory: (address) => memory[address & 0xff]!,
    });
    return { value };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
