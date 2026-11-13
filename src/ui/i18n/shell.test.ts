// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Pill from '../atoms/Pill.svelte';
import EditorTab from '../molecules/EditorTab.svelte';
import FlagCell from '../molecules/FlagCell.svelte';
import { i18n } from './i18n.svelte';

afterEach(() => {
  cleanup();
  i18n.locale = 'en';
});

const noop = () => {};

describe('shell strings', () => {
  it('shows the run state in English by default', () => {
    render(Pill, { state: 'running' });
    expect(screen.getByRole('status').textContent).toContain('Running');
  });

  it('translates atoms and molecules to Spanish', () => {
    i18n.locale = 'es';
    render(Pill, { state: 'waiting' });
    expect(screen.getByRole('status').textContent).toContain('Esperando una tecla');
    render(FlagCell, { name: 'Zero', on: true });
    expect(screen.getByLabelText('Zero activada')).toBeTruthy();
    render(EditorTab, { title: 'a.asm', active: true, dirty: true, id: 'a', onselect: noop, onclose: noop });
    expect(screen.getByTitle('Cerrar (cambios sin guardar)')).toBeTruthy();
  });

  it('updates when the language changes after render', async () => {
    render(Pill, { state: 'paused' });
    expect(screen.getByRole('status').textContent).toContain('Paused');
    i18n.locale = 'es';
    await Promise.resolve();
    expect(screen.getByRole('status').textContent).toContain('En pausa');
  });
});
