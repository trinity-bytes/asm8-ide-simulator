/// <reference lib="webworker" />
import { RunLoop } from '@app/run/run-loop';
import type { RunnerCommand } from '@app/run/protocol';

// The CPU runs here so a fast or endless program never freezes the editor.
const scope = self as unknown as DedicatedWorkerGlobalScope;
const loop = new RunLoop((event) => scope.postMessage(event));
scope.onmessage = (e: MessageEvent<RunnerCommand>) => loop.handleCommand(e.data);
