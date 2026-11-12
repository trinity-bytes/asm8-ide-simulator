import tokens from './tokens.json';

export type ThemeId =
  'asm8-dark' | 'catppuccin-mocha' | 'tokyo-night' | 'monokai' | 'dracula' | 'aura-dark' | 'one-dark';

export interface ThemeInfo {
  readonly id: ThemeId;
  readonly name: string;
  /** A few swatches for the theme picker: surface, text, accent, label, literal. */
  readonly swatches: readonly string[];
}

const pick = (name: keyof typeof tokens.vars, i: number) => tokens.vars[name][i]!;

export const THEMES: readonly ThemeInfo[] = tokens.modes.map((id, i) => ({
  id: id as ThemeId,
  name: tokens.names[i]!,
  swatches: [
    pick('color/surface', i),
    pick('color/text', i),
    pick('color/accent', i),
    pick('syntax/label', i),
    pick('syntax/literal', i),
  ],
}));

export const DEFAULT_THEME: ThemeId = 'asm8-dark';

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

/** Applies a theme to the document (CSS variables switch through `data-theme`). */
export function applyTheme(id: ThemeId, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  const surface = THEMES.find((t) => t.id === id)?.swatches[0];
  if (meta && surface) meta.setAttribute('content', surface);
}
