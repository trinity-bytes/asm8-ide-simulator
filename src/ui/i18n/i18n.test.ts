import { describe, expect, it } from 'vitest';
import { format, i18n, resolveLocale, t, tn } from './i18n.svelte';

describe('resolveLocale', () => {
  it('follows the browser for auto and honors an explicit choice', () => {
    expect(resolveLocale('auto', ['es-AR', 'en'])).toBe('es');
    expect(resolveLocale('auto', ['fr-FR', 'de'])).toBe('en');
    expect(resolveLocale('auto', ['fr-FR', 'es'])).toBe('es');
    expect(resolveLocale('en', ['es-ES'])).toBe('en');
    expect(resolveLocale('es', ['en-US'])).toBe('es');
  });
});

describe('format', () => {
  it('fills named placeholders and leaves unknown ones', () => {
    expect(format('Line {line}: {msg}', { line: 3, msg: 'x' })).toBe('Line 3: x');
    expect(format('Hi {who}', {})).toBe('Hi {who}');
  });
});

describe('t', () => {
  it('translates by the current locale', () => {
    i18n.locale = 'en';
    expect(t('common.cancel')).toBe('Cancel');
    i18n.locale = 'es';
    expect(t('common.cancel')).toBe('Cancelar');
    i18n.locale = 'en';
  });

  it('picks the singular or plural form', () => {
    i18n.locale = 'en';
    expect(tn('common.steps', 1)).toBe('1 step');
    expect(tn('common.steps', 3)).toBe('3 steps');
    i18n.locale = 'es';
    expect(tn('common.steps', 1)).toBe('1 paso');
    expect(tn('common.steps', 0)).toBe('0 pasos');
    i18n.locale = 'en';
  });
});

describe('message tables', () => {
  it('never mention I/O ports: IN and OUT take only a register', async () => {
    const tables = await Promise.all(
      ['common', 'state', 'shell', 'panels', 'editor', 'docs'].map((a) => import(`./messages/${a}.ts`)),
    );
    for (const m of tables)
      for (const text of [...Object.values(m.en), ...Object.values(m.es)] as string[])
        expect(text, text).not.toMatch(/\bport 0x|\bpuerto 0x/i);
  });
});
