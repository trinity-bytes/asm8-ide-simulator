import { afterEach, describe, expect, it } from 'vitest';
import { assemble } from '@core/index';
import { format, i18n } from './i18n.svelte';
import { en } from './messages/state';
import { translateCoreMessage } from './core-messages';

afterEach(() => {
  i18n.locale = 'en';
});

describe('translateCoreMessage', () => {
  it('translates an exact message', () => {
    i18n.locale = 'es';
    expect(translateCoreMessage('Stack overflow')).toBe('Desbordamiento de pila');
    expect(translateCoreMessage('Division by 0')).toBe('División entre 0');
  });

  it('translates parameterized messages and keeps the parameters', () => {
    i18n.locale = 'es';
    expect(translateCoreMessage('Undefined label: loop')).toBe('Etiqueta no definida: loop');
    expect(translateCoreMessage('Label "start" is never used')).toBe('La etiqueta "start" nunca se usa');
    expect(translateCoreMessage('MOV does not support this operands')).toBe('MOV no admite estos operandos');
    expect(translateCoreMessage('Memory access violation at 300')).toBe(
      'Violación de acceso a memoria en 300',
    );
  });

  it('passes unknown messages through', () => {
    i18n.locale = 'es';
    expect(translateCoreMessage('Something else happened')).toBe('Something else happened');
  });

  it('leaves English unchanged', () => {
    i18n.locale = 'en';
    expect(translateCoreMessage('Undefined label: loop')).toBe('Undefined label: loop');
    expect(translateCoreMessage('Stack overflow')).toBe('Stack overflow');
  });

  it('covers every diagnostic the assembler produces for a broken program', () => {
    i18n.locale = 'es';
    const source = [
      'start: MOV A, 300',
      'FOO',
      'JMP nowhere',
      'MOV A',
      'HLT B',
      'DB',
      "MOV A, 'ab'",
      'MOV [B+20], A',
      'MOV A, 1 extra',
      'mov: HLT',
      'start: HLT',
      'ADD [1], [2]',
    ].join('\n');
    for (const d of assemble(source).diagnostics) {
      expect(translateCoreMessage(d.message), d.message).not.toBe(d.message);
    }
  });

  it('has a pattern for every core message in the table', () => {
    i18n.locale = 'es';
    for (const [key, text] of Object.entries(en)) {
      if (!key.startsWith('state.core.')) continue;
      const sample = format(text, {
        name: 'loop',
        instr: 'MOV',
        text: 'x',
        n: 256,
        value: 'NaN',
        address: 300,
        reg: 7,
        code: 99,
        token: ')',
        path: 'a/b.asm',
      });
      expect(translateCoreMessage(sample), key).not.toBe(sample);
    }
  });

  it('translates file and folder name errors', () => {
    i18n.locale = 'es';
    expect(translateCoreMessage('A name is required.')).toBe('Se necesita un nombre.');
    expect(translateCoreMessage('"x.asm" already exists here.')).toBe('"x.asm" ya existe aquí.');
    expect(translateCoreMessage('Not found: a/b.asm')).toBe('No se encontró: a/b.asm');
    i18n.locale = 'en';
  });
});
