// @vitest-environment jsdom
import { assemble, findInstruction, INSTRUCTIONS } from '@core/index';
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReferencePage from '../organisms/editor/ReferencePage.svelte';
import ReferenceView from '../organisms/side/ReferenceView.svelte';
import { AppController } from '../state/app.svelte';
import { EXAMPLES } from '@app/workspace/examples';
import { EXAMPLE_TEXT } from './examples';
import { GUIDE } from './guide';
import { i18n, LOCALES } from './i18n.svelte';
import { INSTRUCTION_DOCS_ES, instructionText } from './instruction-docs.es';

const fakeApp = {
  workspace: { tabs: [], active: null },
  openReference: vi.fn(),
  insertExample: vi.fn(),
  openExample: vi.fn(),
} as unknown as AppController;

describe('Spanish instruction docs', () => {
  it('cover every catalog mnemonic and every text field, example and note', () => {
    expect(Object.keys(INSTRUCTION_DOCS_ES).sort()).toEqual(INSTRUCTIONS.map((i) => i.mnemonic).sort());
    for (const doc of INSTRUCTIONS) {
      const es = instructionText(doc, 'es');
      for (const s of [es.summary, es.details, es.flags]) expect(s.trim(), doc.mnemonic).not.toBe('');
      expect(es.notes.length, doc.mnemonic).toBe(doc.notes.length);
      expect(es.examples.length, doc.mnemonic).toBe(doc.examples.length);
      es.examples.forEach((ex, i) => {
        expect(ex.code).toBe(doc.examples[i]!.code);
        expect(ex.note.trim()).not.toBe('');
      });
      for (const n of es.notes) expect(n.trim(), doc.mnemonic).not.toBe('');
    }
  });

  it('returns the English catalog text for English', () => {
    const mov = findInstruction('MOV')!;
    expect(instructionText(mov, 'en').summary).toBe(mov.summary);
    expect(instructionText(mov, 'es').summary).not.toBe(mov.summary);
  });
});

describe('guide', () => {
  it('has the same sections in both languages, each with content', () => {
    const ids = GUIDE.en.map((s) => s.id);
    expect(GUIDE.es.map((s) => s.id)).toEqual(ids);
    expect(ids).toEqual(
      expect.arrayContaining(['registers', 'syntax', 'addressing', 'memory', 'io', 'labels']),
    );
    for (const locale of LOCALES)
      for (const s of GUIDE[locale]) {
        expect(s.title.trim()).not.toBe('');
        expect(s.paragraphs.length, s.id).toBeGreaterThan(0);
        for (const ex of s.examples ?? []) expect(assemble(ex.code).ok, ex.code).toBe(true);
      }
  });

  it('describe every example program in both languages', () => {
    expect(Object.keys(EXAMPLE_TEXT).sort()).toEqual(EXAMPLES.map((e) => e.file).sort());
    for (const e of EXAMPLES)
      for (const locale of LOCALES) {
        const text = EXAMPLE_TEXT[e.file]![locale];
        expect(text.title.trim(), `${e.file}/${locale}`).not.toBe('');
        expect(text.description.trim(), `${e.file}/${locale}`).not.toBe('');
      }
  });
});

describe('reference views in Spanish', () => {
  afterEach(() => {
    cleanup();
    i18n.locale = 'en';
    vi.restoreAllMocks();
  });

  it('shows the instruction page in the current language', () => {
    vi.spyOn(AppController, 'use').mockReturnValue(fakeApp);
    render(ReferencePage, { mnemonic: 'MOV' });
    expect(screen.getByText('Examples')).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'MOV reg, value' })).toBeTruthy();
    cleanup();
    i18n.locale = 'es';
    render(ReferencePage, { mnemonic: 'MOV' });
    expect(screen.getByText('Ejemplos')).toBeTruthy();
    expect(screen.getByText('Notas')).toBeTruthy();
    expect(screen.getByText(instructionText(findInstruction('MOV')!, 'es').details)).toBeTruthy();
  });

  it('shows the side list and guide in Spanish', () => {
    vi.spyOn(AppController, 'use').mockReturnValue(fakeApp);
    i18n.locale = 'es';
    render(ReferenceView);
    expect(screen.getByRole('region', { name: 'Juego de instrucciones' })).toBeTruthy();
    expect(screen.getByText('Guía')).toBeTruthy();
    expect(screen.getByText(GUIDE.es[0]!.title)).toBeTruthy();
    expect(screen.getByText('Aritmética')).toBeTruthy();
  });

  it('lists the example programs to open in the editor instead of showing their code', async () => {
    vi.spyOn(AppController, 'use').mockReturnValue(fakeApp);
    i18n.locale = 'es';
    render(ReferenceView);
    const open = screen.getByRole('button', {
      name: `Abrir ${EXAMPLE_TEXT['count.asm']!.es.title} en el editor`,
    });
    expect(screen.queryByText(/MOV B, 0\t; counter/)).toBeNull();
    open.click();
    expect(fakeApp.openExample).toHaveBeenCalledWith('count.asm');
  });
});
