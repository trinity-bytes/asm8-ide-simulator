/** Memory map of the 8-bit machine. */
export const MEMORY_SIZE = 256;
/** Highest stack address; the stack grows down from here. */
export const MAX_SP = 231;
export const MIN_SP = 0;
/** First byte of the memory-mapped 24-byte display (0xE8–0xFF). */
export const DISPLAY_START = 232;
export const DISPLAY_SIZE = MEMORY_SIZE - DISPLAY_START;
