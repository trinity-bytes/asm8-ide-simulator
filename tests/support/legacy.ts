import { readFileSync } from 'node:fs';
import { createContext, runInContext, runInNewContext } from 'node:vm';

/** The legacy Angular services, loaded headless (no browser, no Angular). */
export interface Legacy {
  cpu: {
    gpr: number[];
    sp: number;
    ip: number;
    zero: boolean;
    carry: boolean;
    fault: boolean;
    step(): boolean;
    reset(): void;
  };
  memory: { data: number[]; lastAccess: number; reset(): void };
  assembler: {
    go(src: string): { code: number[]; mapping: Record<number, number>; labels: Record<string, number> };
  };
  opcodes: Record<string, number>;
}

const FILES = ['opcodes.js', 'memory.js', 'cpu.js'].map((f) => `legacy/src/emulator/${f}`);
FILES.push('legacy/src/assembler/asm.js');
const SOURCES = FILES.map((f) => readFileSync(f, 'utf8'));

export function loadLegacy(): Legacy {
  const registry: Record<string, unknown> = {};
  const app = {
    service(name: string, def: unknown[]) {
      const factory = def[def.length - 1] as (...deps: unknown[]) => unknown;
      registry[name] = factory(...def.slice(0, -1).map((d) => registry[d as string]));
    },
  };
  const ctx = createContext({ app, angular: { isNumber: (x: unknown) => typeof x === 'number' } });
  for (const src of SOURCES) runInContext(src, ctx);
  return registry as unknown as Legacy;
}

/** The example program shipped with the legacy simulator. */
export const HELLO_WORLD = runInNewContext(
  readFileSync('legacy/src/ui/controller.js', 'utf8').match(/\$scope\.code = (".*");/)![1]!,
) as string;
