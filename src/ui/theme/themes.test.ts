import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from './tokens.json';
import { THEME_IDS } from '@app/settings/settings';
import { THEME_GROUPS, THEMES } from './themes';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('themes', () => {
  it('offers seven dark and three light themes', () => {
    expect(THEMES.map((t) => t.name)).toEqual([
      'Asm8 Dark',
      'Catppuccin Mocha',
      'Tokyo Night',
      'Monokai',
      'Dracula',
      'Aura Dark',
      'One Dark',
      'Asm8 Light',
      'Catppuccin Latte',
      'GitHub Light',
    ]);
  });

  it('accepts exactly the themes defined in tokens.json as a setting', () => {
    expect([...THEME_IDS]).toEqual(tokens.modes);
  });

  it('groups themes by appearance, dark first', () => {
    expect(THEME_GROUPS.map((g) => [g.appearance, g.themes.map((t) => t.id)])).toEqual([
      [
        'dark',
        ['asm8-dark', 'catppuccin-mocha', 'tokyo-night', 'monokai', 'dracula', 'aura-dark', 'one-dark'],
      ],
      ['light', ['asm8-light', 'catppuccin-latte', 'github-light']],
    ]);
  });

  it('keeps tokens.css in sync with tokens.json (run node scripts/tokens.mjs)', () => {
    const css = readFileSync('src/ui/theme/tokens.css', 'utf8');
    for (const [name, values] of Object.entries(tokens.vars)) {
      for (const v of values) expect(css).toContain(`--${name.replace('/', '-')}: ${v};`);
    }
  });

  it('Asm8 Dark meets 4.5:1 for text and muted text on every background', () => {
    const v = (name: keyof typeof tokens.vars) => tokens.vars[name][0]!;
    for (const bg of ['color/ground', 'color/surface', 'color/raised'] as const) {
      expect(contrast(v('color/text'), v(bg))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v('color/muted'), v(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Asm8 Light meets 4.5:1 for every foreground token on every background', () => {
    const i = tokens.modes.indexOf('asm8-light');
    const v = (name: keyof typeof tokens.vars) => tokens.vars[name][i]!;
    const fg = Object.keys(tokens.vars).filter(
      (k) =>
        ![
          'color/ground',
          'color/surface',
          'color/raised',
          'color/border',
          'color/rule',
          'color/control',
        ].includes(k),
    ) as (keyof typeof tokens.vars)[];
    for (const bg of ['color/ground', 'color/surface', 'color/raised'] as const) {
      for (const name of fg) expect(contrast(v(name), v(bg)), `${name} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
