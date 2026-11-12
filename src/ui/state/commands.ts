/** A user action reachable from the command palette and, optionally, a keyboard shortcut. */
export interface Command {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  /** Display form, e.g. `Ctrl+Shift+P`, `F5`, or a chord `Ctrl+K O`. */
  readonly keys?: string;
  readonly run: () => void;
  readonly enabled?: () => boolean;
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Shortcut text for display: Ctrl becomes ⌘ on Apple devices. */
export const displayKeys = (keys: string): string =>
  isMac() ? keys.replaceAll('Ctrl+', '⌘').replaceAll('Shift+', '⇧').replaceAll('Alt+', '⌥') : keys;

const normalizeKey = (key: string): string => {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
};

/** `Ctrl+Shift+P` for a keyboard event (Cmd counts as Ctrl). */
export function eventChord(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  // Shift is part of symbols like "?" already, so it only counts for letters, digits and named keys.
  const symbol = e.key.length === 1 && !/[a-z0-9]/i.test(e.key);
  if (e.shiftKey && !symbol) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  parts.push(e.key === ',' ? ',' : normalizeKey(e.key));
  return parts.join('+');
}

/**
 * Matches key presses against commands, including two-step chords (`Ctrl+K S`).
 * Returns true when the event was used.
 */
export class Keymap {
  private pending: string | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly commands: () => readonly Command[]) {}

  handle(e: KeyboardEvent): boolean {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return false;
    const chord = eventChord(e);
    const typed = this.pending ? `${this.pending} ${chord}` : chord;
    const all = this.commands().filter((c) => c.keys);

    const exact = all.find((c) => c.keys === typed);
    if (exact) {
      this.clearPending();
      if (exact.enabled && !exact.enabled()) return true;
      e.preventDefault();
      exact.run();
      return true;
    }
    if (!this.pending && all.some((c) => c.keys!.startsWith(chord + ' '))) {
      e.preventDefault();
      this.pending = chord;
      this.pendingTimer = setTimeout(() => this.clearPending(), 1500);
      return true;
    }
    this.clearPending();
    return false;
  }

  private clearPending(): void {
    this.pending = null;
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
  }
}

/** Fuzzy score for the palette: all query letters in order; earlier and contiguous is better. */
export function fuzzyScore(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    if (ch === ' ') continue;
    const i = t.indexOf(ch, from);
    if (i < 0) return null;
    score += i === prev + 1 ? 3 : 1;
    if (i === 0 || t[i - 1] === ' ' || t[i - 1] === ':' || t[i - 1] === '/') score += 2;
    prev = i;
    from = i + 1;
  }
  return score - t.length * 0.01;
}
