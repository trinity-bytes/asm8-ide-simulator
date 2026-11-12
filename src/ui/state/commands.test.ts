import { describe, expect, it, vi } from 'vitest';
import { fuzzyScore, Keymap, type Command } from './commands';

const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
  ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...mods,
  }) as unknown as KeyboardEvent;

describe('Keymap', () => {
  it('runs single shortcuts and two-step chords', () => {
    const save = vi.fn();
    const shortcuts = vi.fn();
    const cmds: Command[] = [
      { id: 's', category: 'File', title: 'Save', keys: 'Ctrl+S', run: save },
      { id: 'k', category: 'Pref', title: 'Shortcuts', keys: 'Ctrl+K S', run: shortcuts },
      { id: 'p', category: 'View', title: 'Palette', keys: 'Ctrl+Shift+P', run: vi.fn() },
    ];
    const km = new Keymap(() => cmds);
    expect(km.handle(key('s', { ctrlKey: true }))).toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(km.handle(key('k', { ctrlKey: true }))).toBe(true);
    expect(km.handle(key('s'))).toBe(true);
    expect(shortcuts).toHaveBeenCalledOnce();
    expect(km.handle(key('P', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(km.handle(key('x'))).toBe(false);
  });

  it('skips disabled commands without running them', () => {
    const run = vi.fn();
    const km = new Keymap(() => [
      { id: 'x', category: 'Run', title: 'Step', keys: 'F10', run, enabled: () => false },
    ]);
    km.handle(key('F10'));
    expect(run).not.toHaveBeenCalled();
  });
});

describe('fuzzyScore', () => {
  it('matches letters in order and prefers word starts', () => {
    expect(fuzzyScore('Run: Step over CALL', 'xyz')).toBeNull();
    expect(fuzzyScore('Run: Step', 'step')!).toBeGreaterThan(fuzzyScore('Run: Restart', 'step') ?? -1);
  });
});
