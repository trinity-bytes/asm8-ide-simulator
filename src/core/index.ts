// Public surface of the domain core. Nothing here touches the DOM or a framework.
export { assemble, type Assembly, type Diagnostic, type Severity } from './assembler/assembler';
export { MNEMONICS } from './assembler/encodings';
export {
  INSTRUCTIONS,
  GROUP_ORDER,
  findInstruction,
  type InstructionDoc,
  type InstructionGroup,
} from './isa/catalog';
export { Opcode } from './isa/opcodes';
export { REGISTER_NAMES, GPR_NAMES, type RegisterName } from './isa/registers';
export {
  Machine,
  type MachineSnapshot,
  type MachineStatus,
  type MemoryWrite,
  type MachineState,
  MAX_WRITES_KEPT,
} from './machine/machine';
export type { Registers } from './machine/cpu';
export { MEMORY_SIZE, MAX_SP, DISPLAY_START, DISPLAY_SIZE } from './machine/layout';
export { Debugger, type BreakpointSpec, type StopReason } from './debug/debugger';
export { evaluate } from './debug/condition';
export { describeStack, callStack, type StackEntry, type Frame } from './debug/stack';
export { formatByte, hex, bin, charOf, type NumberBase } from './format/number';
