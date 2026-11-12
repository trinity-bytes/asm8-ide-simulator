import { MEMORY_SIZE } from './layout';
import { MachineFault } from './fault';

/** Called after every store with the previous and new byte. */
export type StoreListener = (address: number, previous: number, value: number) => void;

/** 256 bytes of RAM. Every access is bounds-checked like the legacy simulator. */
export class Memory {
  readonly data = new Uint8Array(MEMORY_SIZE);
  /** Address of the last load or store, -1 after reset. */
  lastAccess = -1;
  onStore: StoreListener | null = null;

  private check(address: number): void {
    if (!(address >= 0 && address < this.data.length)) {
      throw new MachineFault(`Memory access violation at ${address}`);
    }
  }

  load(address: number): number {
    this.check(address);
    this.lastAccess = address;
    return this.data[address]!;
  }

  store(address: number, value: number): void {
    this.check(address);
    this.lastAccess = address;
    const previous = this.data[address]!;
    this.data[address] = value;
    this.onStore?.(address, previous, this.data[address]!);
  }

  /** Copies a program to address 0; the rest of memory is cleared. */
  loadProgram(bytes: readonly number[]): void {
    this.reset();
    this.data.set(bytes.slice(0, this.data.length));
  }

  reset(): void {
    this.lastAccess = -1;
    this.data.fill(0);
  }
}
