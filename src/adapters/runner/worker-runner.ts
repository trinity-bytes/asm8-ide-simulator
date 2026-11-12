import type { RunnerCommand, RunnerEvent, RunnerPort } from '@app/run/protocol';
import { InlineRunner } from './inline-runner';

/** RunnerPort backed by a dedicated Web Worker. */
export class WorkerRunner implements RunnerPort {
  private readonly listeners = new Set<(e: RunnerEvent) => void>();
  private readonly worker: Worker;

  constructor() {
    this.worker = new Worker(new URL('./runner.worker.ts', import.meta.url), {
      type: 'module',
      name: 'asm8-cpu',
    });
    this.worker.onmessage = (e: MessageEvent<RunnerEvent>) => {
      for (const l of this.listeners) l(e.data);
    };
  }

  send(command: RunnerCommand): void {
    this.worker.postMessage(command);
  }

  subscribe(listener: (e: RunnerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.worker.terminate();
    this.listeners.clear();
  }
}

/** Worker when the browser supports module workers, otherwise the same loop on the main thread. */
export function createRunner(): RunnerPort {
  try {
    if (typeof Worker !== 'undefined') return new WorkerRunner();
  } catch {
    // Fall through to the inline runner.
  }
  return new InlineRunner();
}
