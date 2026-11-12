/** A runtime error raised by the CPU or memory (the program, not the simulator, is wrong). */
export class MachineFault extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MachineFault';
  }
}
