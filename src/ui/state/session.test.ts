import { describe, expect, it } from 'vitest';
import { InlineRunner } from '@adapters/runner/inline-runner';
import { i18n } from '../i18n/i18n.svelte';
import { SessionState } from './session.svelte';

const flush = () => new Promise((r) => setTimeout(r, 0));
const until = async (fn: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe('SessionState', () => {
  it('assembles, runs at Max and logs the halt with the display text', async () => {
    const s = new SessionState(new InlineRunner());
    s.speed = 'max';
    s.run('hello.asm', "MOV [232], 'H'\nMOV [233], 'i'\nHLT");
    await until(() => s.state === 'halted');
    const kinds = s.console.map((e) => `${e.kind} ${e.text}`);
    expect(kinds).toEqual([
      'asm assemble hello.asm',
      'asm 7 bytes · 0 labels · 0 problems',
      'run Run started at Max',
      'out Hi',
      'cpu Halted at 0x06 (HLT, line 3) after 3 steps',
    ]);
    expect(s.writes).toHaveLength(2);
    s.dispose();
  });

  it('reports assembly errors in the console and does not run', async () => {
    const s = new SessionState(new InlineRunner());
    s.run('bad.asm', 'MOV A, 300\nFOO');
    await flush();
    expect(s.state).toBe('empty');
    expect(s.console.filter((e) => e.kind === 'err').map((e) => e.text)).toEqual([
      'bad.asm:1  number must have a value between 0-255',
      'bad.asm:2  Invalid instruction: FOO',
    ]);
    s.dispose();
  });

  it('collects OUT bytes into one tty line per newline and marks changed registers', async () => {
    const s = new SessionState(new InlineRunner());
    s.speed = 'max';
    s.run('o.asm', "MOV A, 'o'\nOUT A\nOUT A\nMOV B, 10\nOUT B\nMOV A, 'k'\nOUT A\nHLT");
    await until(() => s.state === 'halted');
    expect(s.console.filter((e) => e.kind === 'tty').map((e) => e.text)).toEqual(['oo', 'k']);
    s.dispose();
  });

  it('steps, pauses at a breakpoint and reports where', async () => {
    const s = new SessionState(new InlineRunner());
    s.speed = 'max';
    s.toggleBreakpoint('b.asm', 1);
    s.run('b.asm', 'MOV A, 1\nMOV A, 2\nHLT');
    await until(() => s.state === 'paused');
    expect(s.console.at(-1)?.text).toBe('Paused at breakpoint b.asm:2 (0x03) · step 1');
    s.step('b.asm', 'MOV A, 1\nMOV A, 2\nHLT');
    await until(() => s.snapshot?.steps === 2);
    expect(s.changedNow).toContain('A');
    expect(s.changedAt.A).toBe(2);
    s.dispose();
  });

  it('reset clears the write log and undo brings the run back', async () => {
    const s = new SessionState(new InlineRunner());
    s.step('r.asm', 'MOV [200], 1\nHLT');
    await until(() => s.writes.length === 1);
    s.reset();
    await until(() => s.writes.length === 0 && s.state === 'ready');
    s.undoReset();
    await until(() => s.writes.length === 1);
    expect(s.state).toBe('paused');
    s.dispose();
  });

  it('sends typed keys to a waiting program', async () => {
    const s = new SessionState(new InlineRunner());
    s.speed = 'max';
    s.run('e.asm', 'IN A\nOUT A\nHLT');
    await until(() => s.state === 'waiting');
    s.sendInput('z');
    await until(() => s.state === 'halted');
    expect(s.console.find((e) => e.kind === 'tty')?.text).toBe('z');
    s.dispose();
  });

  it('restart reloads and runs again even while running', async () => {
    const s = new SessionState(new InlineRunner());
    s.speed = 1;
    s.run('r.asm', 'loop: JMP loop');
    await until(() => s.state === 'running');
    s.restart('r.asm', 'MOV A, 1\nHLT');
    s.setSpeed('max');
    await until(() => s.state === 'halted');
    expect(s.snapshot?.registers.gpr[0]).toBe(1);
    s.dispose();
  });

  it('breakpoints and the loaded program follow a rename', () => {
    const s = new SessionState(new InlineRunner());
    s.toggleBreakpoint('lab/a.asm', 3);
    s.renamePath('lab', 'lab2');
    expect(s.breakpointsFor('lab2/a.asm')).toEqual([{ line: 3 }]);
    s.dispose();
  });

  it('quick steps sent before the runner answers do not reload the program', async () => {
    const s = new SessionState(new InlineRunner());
    const src = 'MOV A, 1\nMOV B, 2\nMOV C, 3\nHLT';
    s.step('q.asm', src);
    s.step('q.asm', src);
    s.step('q.asm', src);
    await until(() => s.snapshot?.steps === 3);
    expect(s.console.filter((e) => e.text.startsWith('assemble'))).toHaveLength(1);
    s.dispose();
  });

  it('shows console notices and faults in Spanish and switches back to English', async () => {
    i18n.locale = 'es';
    try {
      const s = new SessionState(new InlineRunner());
      s.speed = 'max';
      s.run('f.asm', 'MOV A, 0\nDIV A\nHLT');
      await until(() => s.state === 'fault');
      expect(s.console.map((e) => e.text)).toEqual([
        'ensamblar f.asm',
        '6 bytes · 0 etiquetas · 0 problemas',
        'Ejecución iniciada a Max',
        'División entre 0 en 0x03 (línea 2)',
      ]);
      expect(s.snapshot?.fault).toBe('División entre 0');
      expect(s.lastStop).toEqual({ kind: 'fault', message: 'División entre 0' });
      i18n.locale = 'en';
      expect(s.console.at(-1)?.text).toBe('Division by 0 at 0x03 (line 2)');
      expect(s.snapshot?.fault).toBe('Division by 0');
      s.dispose();
    } finally {
      i18n.locale = 'en';
    }
  });
});
