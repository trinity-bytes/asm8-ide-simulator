// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryFileSystem } from '@adapters/fs/memory-file-system';
import type { RunnerPort } from '@app/run/protocol';
import { DEFAULT_SETTINGS, type Settings } from '@app/settings/settings';
import type { WorkspaceProvider } from '@app/workspace/workspace-provider';
import SettingsPage from '../organisms/editor/SettingsPage.svelte';
import Welcome from '../organisms/editor/Welcome.svelte';
import { AppController } from '../state/app.svelte';
import { i18n } from './i18n.svelte';

const fs = new MemoryFileSystem('browser', 'ws', {});
const provider: WorkspaceProvider = {
  canOpenFolders: true,
  openFolder: async () => fs,
  browserWorkspace: async () => fs,
  examples: () => fs,
  restoreLast: async () => null,
  openRecent: async () => null,
  recent: async () => [],
  forgetRecent: async () => {},
  requestAccess: async () => true,
  rememberCurrent: async () => {},
  pickFiles: async () => [],
  download: vi.fn(),
};
const runner: RunnerPort = { send: () => {}, subscribe: () => () => {}, dispose: () => {} };

function makeApp(initial: Partial<Settings> = {}) {
  let saved: Settings = { ...DEFAULT_SETTINGS, language: 'en', ...initial };
  const app = new AppController({
    runner,
    provider,
    settingsRepo: { load: () => saved, save: (s) => (saved = s) },
  });
  vi.spyOn(AppController, 'use').mockReturnValue(app);
  return { app, saved: () => saved };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  i18n.locale = 'en';
});

describe('editor pages strings', () => {
  it('shows a Language row and switches the UI to Spanish when Español is chosen', async () => {
    const { saved } = makeApp();
    render(SettingsPage);
    expect(screen.getByText('Font size')).toBeTruthy();
    const select = screen.getByLabelText('Language') as HTMLSelectElement;
    const labels = [...select.options].map((o) => o.textContent);
    expect(labels).toEqual(['Same as browser', 'English', 'Español']);

    await fireEvent.change(select, { target: { value: 'es' } });

    expect(saved().language).toBe('es');
    expect(i18n.locale).toBe('es');
    expect(screen.getByText('Tamaño de letra')).toBeTruthy();
    expect(screen.getByLabelText('Idioma')).toBeTruthy();
    expect(screen.getByText('Igual que el navegador')).toBeTruthy();
  });

  it('searches the text shown in the current language', async () => {
    makeApp();
    i18n.locale = 'es';
    render(SettingsPage);
    await fireEvent.input(screen.getByPlaceholderText('Buscar ajustes'), { target: { value: 'tamaño' } });
    expect(screen.getByText('Tamaño de letra')).toBeTruthy();
    expect(screen.queryByText('Ajuste de líneas largas')).toBeNull();
    await fireEvent.input(screen.getByPlaceholderText('Buscar ajustes'), { target: { value: 'zzz' } });
    expect(screen.getByText('Ningún ajuste coincide con “zzz”.')).toBeTruthy();
  });

  it('translates the welcome page', () => {
    makeApp();
    i18n.locale = 'es';
    render(Welcome);
    expect(screen.getByText('Nuevo archivo')).toBeTruthy();
    expect(screen.getByText('Ejemplos')).toBeTruthy();
  });
});
