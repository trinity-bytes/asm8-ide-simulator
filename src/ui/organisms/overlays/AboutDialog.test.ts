// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '../../i18n/i18n.svelte';
import { AppController } from '../../state/app.svelte';
import AboutDialog from './AboutDialog.svelte';

const fakeApp = {
  ui: { online: true, overlay: { kind: 'about' } },
  installed: false,
  installAvailable: false,
  workspace: { provider: { canOpenFolders: true } },
} as unknown as AppController;

describe('AboutDialog credits', () => {
  beforeEach(() => {
    vi.stubGlobal('__APP_VERSION__', '1.2.0');
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    vi.spyOn(AppController, 'use').mockReturnValue(fakeApp);
  });
  afterEach(() => {
    cleanup();
    i18n.locale = 'en';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('links to the fork author website and profiles, opening in a new tab', () => {
    render(AboutDialog);
    const author = screen.getByRole('list', { name: 'Jahat Trinidad' });
    const links = within(author).getAllByRole('link');
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Website', 'https://jahattrinidad.com'],
      ['GitHub', 'https://github.com/trinity-bytes'],
      ['LinkedIn', 'https://www.linkedin.com/in/trinitybytes'],
      ['Instagram', 'https://www.instagram.com/trinitybytes/'],
      ['YouTube', 'https://www.youtube.com/@jahattrinidad'],
      ['X', 'https://x.com/trinitybytes'],
    ]);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('still credits the original simulator and its author', () => {
    render(AboutDialog);
    const original = screen.getByRole('link', { name: 'Simple 8-bit Assembler Simulator' });
    expect(original.getAttribute('href')).toBe('https://github.com/Schweigi/assembler-simulator');
    expect(screen.getByText(/Marco Schweighauser/)).toBeTruthy();
  });

  it('shows the credits in Spanish', () => {
    i18n.locale = 'es';
    render(AboutDialog);
    expect(screen.getByText(/Fork y rediseño de/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sitio web' }).getAttribute('href')).toBe(
      'https://jahattrinidad.com',
    );
  });
});
