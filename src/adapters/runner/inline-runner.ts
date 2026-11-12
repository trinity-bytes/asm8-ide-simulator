import { RunLoop, realTimer, type Timer } from '@app/run/run-loop';
import type { RunnerCommand, RunnerEvent, RunnerPort } from '@app/run/protocol';

/** RunnerPort on the current thread (tests and browsers without module workers). */
export class InlineRunner implements RunnerPort {
  private readonly listeners = new Set<(e: RunnerEvent) => void>();
  private readonly loop: RunLoop;

  constructor(timer: Timer = realTimer) {
    // Events are delivered asynchronously, like postMessage, so callers see the same ordering.
    this.loop = new RunLoop((event) => queueMicrotask(() => this.listeners.forEach((l) => l(event))), timer);
  }

  send(command: RunnerCommand): void {
    this.loop.handleCommand(structuredClone(command));
  }

  subscribe(listener: (e: RunnerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.loop.dispose();
    this.listeners.clear();
  }
}
