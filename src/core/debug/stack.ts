import type { Assembly } from '../assembler/assembler';
import { Opcode } from '../isa/opcodes';
import { MAX_SP } from '../machine/layout';
import type { MemoryWrite } from '../machine/machine';

export interface StackEntry {
  readonly address: number;
  readonly value: number;
  /** Source line of the instruction that last wrote this byte. */
  readonly pushedBy: number | undefined;
  /** Set when the byte is a return address pushed by CALL. */
  readonly returnTo: number | undefined;
}

export interface Frame {
  /** Line of the CALL that created the frame. */
  readonly callLine: number | undefined;
  /** Line execution resumes at after RET. */
  readonly returnLine: number | undefined;
  readonly returnAddress: number;
}

const isCall = (code: readonly number[], address: number) =>
  code[address] === Opcode.CALL_ADDRESS || code[address] === Opcode.CALL_REGADDRESS;

/** Bytes currently on the stack, top first, with who pushed them. */
export function describeStack(
  memory: Uint8Array,
  sp: number,
  assembly: Assembly | null,
  writes: readonly MemoryWrite[],
): StackEntry[] {
  const lastWriter = new Map<number, number | undefined>();
  for (const w of writes) lastWriter.set(w.address, w.line);
  const entries: StackEntry[] = [];
  for (let address = sp + 1; address <= MAX_SP; address++) {
    const value = memory[address] ?? 0;
    const pushedBy = lastWriter.get(address);
    const callAt = value - 2;
    const viaCall = assembly !== null && callAt >= 0 && isCall(assembly.code, callAt);
    const writerIsCall = pushedBy !== undefined && assembly?.lineToAddress.get(pushedBy) === callAt;
    entries.push({ address, value, pushedBy, returnTo: viaCall && writerIsCall ? value : undefined });
  }
  return entries;
}

/** Call stack read from the return addresses on the stack, innermost first. */
export function callStack(entries: readonly StackEntry[], assembly: Assembly | null): Frame[] {
  return entries
    .filter((e) => e.returnTo !== undefined)
    .map((e) => ({
      callLine: e.pushedBy,
      returnLine: assembly?.addressToLine.get(e.value),
      returnAddress: e.value,
    }));
}
