export type NumberBase = 'hex' | 'dec' | 'bin';

export const hex = (n: number, digits = 2): string => n.toString(16).toUpperCase().padStart(digits, '0');
export const bin = (n: number): string => n.toString(2).padStart(8, '0');

/** Byte shown in the chosen base: `0x41`, `65` or `01000001`. */
export function formatByte(n: number, base: NumberBase): string {
  switch (base) {
    case 'hex':
      return `0x${hex(n)}`;
    case 'dec':
      return String(n);
    case 'bin':
      return bin(n);
  }
}

/** Printable character for a byte, or a middle dot. */
export const charOf = (n: number): string => (n >= 32 && n < 127 ? String.fromCharCode(n) : '·');
