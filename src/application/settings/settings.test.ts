import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('sanitizeSettings', () => {
  it('returns defaults for garbage', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and replaces invalid ones field by field', () => {
    const s = sanitizeSettings({
      fontSize: 16,
      tabSize: 3,
      defaultSpeed: 'max',
      theme: 'dracula',
      numberBase: 'oct',
    });
    expect(s).toMatchObject({
      fontSize: 16,
      tabSize: 8,
      defaultSpeed: 'max',
      theme: 'dracula',
      numberBase: 'hex',
    });
  });

  it('keeps a known language and falls back to auto', () => {
    expect(DEFAULT_SETTINGS.language).toBe('auto');
    expect(sanitizeSettings({ language: 'es' }).language).toBe('es');
    expect(sanitizeSettings({ language: 'fr' }).language).toBe('auto');
  });
});
