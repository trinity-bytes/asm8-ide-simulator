import type { ThemeSetting } from '@app/settings/settings';
import tokens from './tokens.json';

export type ThemeId = ThemeSetting;
export type Appearance = 'dark' | 'light';

export interface ThemeInfo {
  readonly id: ThemeId;
  readonly name: string;
  readonly appearance: Appearance;
  /** A few swatches for the theme picker: surface, text, accent, label, literal. */
  readonly swatches: readonly string[];
}

export interface ThemeGroup {
  readonly appearance: Appearance;
  readonly themes: readonly ThemeInfo[];
}

const pick = (name: keyof typeof tokens.vars, i: number) => tokens.vars[name][i]!;

/** WCAG relative luminance of a `#rrggbb` color. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

export const THEMES: readonly ThemeInfo[] = tokens.modes.map((id, i) => ({
  id: id as ThemeId,
  name: tokens.names[i]!,
  // A theme is light when its editor surface is closer to white than to black.
  appearance: luminance(pick('color/surface', i)) > 0.5 ? 'light' : 'dark',
  swatches: [
    pick('color/surface', i),
    pick('color/text', i),
    pick('color/accent', i),
    pick('syntax/label', i),
    pick('syntax/literal', i),
  ],
}));

export const THEME_GROUPS: readonly ThemeGroup[] = (['dark', 'light'] as const).map((appearance) => ({
  appearance,
  themes: THEMES.filter((t) => t.appearance === appearance),
}));

export const DEFAULT_THEME: ThemeId = 'asm8-dark';

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

/** Applies a theme to the document (CSS variables switch through `data-theme`). */
export function applyTheme(id: ThemeId, root: HTMLElement = document.documentElement): void {
  const theme = THEMES.find((t) => t.id === id);
  root.dataset.theme = id;
  // Native controls and scrollbars follow the theme's appearance.
  if (theme) root.style.colorScheme = theme.appearance;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && theme) meta.setAttribute('content', theme.swatches[0]!);
}
