import type { LanguageSetting } from '@app/settings/settings';
import * as common from './messages/common';
import * as docs from './messages/docs';
import * as editor from './messages/editor';
import * as panels from './messages/panels';
import * as shell from './messages/shell';
import * as state from './messages/state';

export type Locale = 'en' | 'es';
export const LOCALES: readonly Locale[] = ['en', 'es'];

const EN = { ...common.en, ...state.en, ...shell.en, ...panels.en, ...editor.en, ...docs.en };
const ES: Record<MessageKey, string> = {
  ...common.es,
  ...state.es,
  ...shell.es,
  ...panels.es,
  ...editor.es,
  ...docs.es,
};
const TABLES: Record<Locale, Record<MessageKey, string>> = { en: EN, es: ES };

export type MessageKey = keyof typeof EN;
/** Keys that have `.one` / `.other` forms, without the suffix. */
export type PluralKey = { [K in MessageKey]: K extends `${infer B}.one` ? B : never }[MessageKey];
export type Params = Readonly<Record<string, string | number>>;

/** `auto` picks the first browser language Asm8 has, else English. */
export function resolveLocale(setting: LanguageSetting, preferred: readonly string[]): Locale {
  if (setting !== 'auto') return setting;
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0] as Locale;
    if (LOCALES.includes(base)) return base;
  }
  return 'en';
}

export function format(text: string, params: Params): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Reactive current locale: templates and `$derived` that call `t` update when it changes. */
class I18n {
  locale = $state<Locale>('en');
}
export const i18n = new I18n();

export function t(key: MessageKey, params: Params = {}): string {
  return format(TABLES[i18n.locale][key] ?? EN[key], params);
}

export function tn(key: PluralKey, n: number, params: Params = {}): string {
  const form = n === 1 ? 'one' : 'other';
  return t(`${key}.${form}` as MessageKey, { n, ...params });
}

/** Apply the setting to the page (`<html lang>`) and the message tables. */
export function applyLanguage(setting: LanguageSetting): void {
  const langs = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  i18n.locale = resolveLocale(setting, langs);
  if (typeof document !== 'undefined') document.documentElement.lang = i18n.locale;
}
