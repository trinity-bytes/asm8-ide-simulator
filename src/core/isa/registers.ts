/** Register codes as encoded in machine code. A–D are general purpose, SP is the stack pointer. */
export const Register = { A: 0, B: 1, C: 2, D: 3, SP: 4 } as const;
export type RegisterName = keyof typeof Register;
export const REGISTER_NAMES: readonly RegisterName[] = ['A', 'B', 'C', 'D', 'SP'];
export const GPR_NAMES: readonly RegisterName[] = ['A', 'B', 'C', 'D'];

export const registerName = (code: number): RegisterName | undefined => REGISTER_NAMES[code];
