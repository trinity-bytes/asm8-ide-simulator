import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from './tokens.json';
import { THEMES } from './themes';

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
  it('offers Asm8 Dark plus the six required themes', () => {
    expect(THEMES.map((t) => t.name)).toEqual([
      'Asm8 Dark',
      'Catppuccin Mocha',
      'Tokyo Night',
      'Monokai',
      'Dracula',
      'Aura Dark',
      'One Dark',
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
});
