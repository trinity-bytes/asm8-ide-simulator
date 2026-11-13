import type { NumberBase } from '@core/index';
import { isSpeed, type Speed } from '../run/protocol';

export const THEME_IDS = [
  'asm8-dark',
  'catppuccin-mocha',
  'tokyo-night',
  'monokai',
  'dracula',
  'aura-dark',
  'one-dark',
] as const;
export type ThemeSetting = (typeof THEME_IDS)[number];

export const LANGUAGES = ['auto', 'en', 'es'] as const;
export type LanguageSetting = (typeof LANGUAGES)[number];

export interface Settings {
  // Editor
  readonly fontSize: number;
  readonly tabSize: number;
  readonly showAddresses: boolean;
  readonly inlineHints: boolean;
  // Run
  readonly defaultSpeed: Speed;
  readonly pauseOnFault: boolean;
  // Machine
  readonly numberBase: NumberBase;
  readonly markChanges: boolean;
  // Console
  readonly consoleWrap: boolean;
  readonly consoleView: 'text' | 'hex';
  readonly scrollback: number;
  // Appearance
  readonly theme: ThemeSetting;
  /** `auto` follows the browser language. */
  readonly language: LanguageSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 13,
  tabSize: 8,
  showAddresses: true,
  inlineHints: true,
  defaultSpeed: 4,
  pauseOnFault: true,
  numberBase: 'hex',
  markChanges: true,
  consoleWrap: true,
  consoleView: 'text',
  scrollback: 10_000,
  theme: 'asm8-dark',
  language: 'auto',
};

export const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18] as const;
export const TAB_SIZES = [2, 4, 8] as const;
export const SCROLLBACK_SIZES = [1_000, 10_000, 50_000] as const;

const pickNumber = (v: unknown, allowed: readonly number[], fallback: number) =>
  typeof v === 'number' && allowed.includes(v) ? v : fallback;
const pickBool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const pickOne = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

/** Accepts anything (old versions, hand-edited storage) and returns valid settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    fontSize: pickNumber(r.fontSize, FONT_SIZES, d.fontSize),
    tabSize: pickNumber(r.tabSize, TAB_SIZES, d.tabSize),
    showAddresses: pickBool(r.showAddresses, d.showAddresses),
    inlineHints: pickBool(r.inlineHints, d.inlineHints),
    defaultSpeed: isSpeed(r.defaultSpeed) ? r.defaultSpeed : d.defaultSpeed,
    pauseOnFault: pickBool(r.pauseOnFault, d.pauseOnFault),
    numberBase: pickOne(r.numberBase, ['hex', 'dec', 'bin'] as const, d.numberBase),
    markChanges: pickBool(r.markChanges, d.markChanges),
    consoleWrap: pickBool(r.consoleWrap, d.consoleWrap),
    consoleView: pickOne(r.consoleView, ['text', 'hex'] as const, d.consoleView),
    scrollback: pickNumber(r.scrollback, SCROLLBACK_SIZES, d.scrollback),
    theme: pickOne(r.theme, THEME_IDS, d.theme),
    language: pickOne(r.language, LANGUAGES, d.language),
  };
}

/** Port: where settings are kept. */
export interface SettingsRepository {
  load(): Settings;
  save(settings: Settings): void;
}
