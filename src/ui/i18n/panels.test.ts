// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProblemsView from '../organisms/panel/ProblemsView.svelte';
import { AppController } from '../state/app.svelte';
import { i18n } from './i18n.svelte';

/** Just enough of the app for the Problems view with no file open. */
const fakeApp = { activeAssembly: null, workspace: { activeFile: null } } as unknown as AppController;

describe('panels in Spanish', () => {
  afterEach(() => {
    cleanup();
    i18n.locale = 'en';
    vi.restoreAllMocks();
  });

  it('shows the Problems empty state in the current language', () => {
    vi.spyOn(AppController, 'use').mockReturnValue(fakeApp);
    i18n.locale = 'en';
    render(ProblemsView);
    expect(screen.getByText('Open a file to see its problems.')).toBeTruthy();
    cleanup();
    i18n.locale = 'es';
    render(ProblemsView);
    expect(screen.getByText('Abre un archivo para ver sus problemas.')).toBeTruthy();
  });
});
