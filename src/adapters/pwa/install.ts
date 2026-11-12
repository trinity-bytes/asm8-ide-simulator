/** `beforeinstallprompt` is Chromium-only and not in the DOM typings. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallNavigator = Navigator & { install?: () => Promise<unknown> };

/**
 * Wires the install offer. Uses the Web Install API (`navigator.install()`) where it exists and
 * falls back to `beforeinstallprompt`. Returns a cleanup function.
 */
export function setupInstall(
  onAvailable: (prompt: (() => Promise<boolean>) | null) => void,
  onInstalled: () => void,
): () => void {
  const nav = navigator as InstallNavigator;
  const standalone = matchMedia('(display-mode: standalone)').matches;
  if (standalone) {
    onInstalled();
    return () => {};
  }

  if (typeof nav.install === 'function') {
    onAvailable(async () => {
      try {
        await nav.install!();
        return true;
      } catch {
        return false;
      }
    });
  }

  const onPrompt = (e: Event) => {
    e.preventDefault();
    const evt = e as InstallPromptEvent;
    onAvailable(async () => {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === 'accepted') onAvailable(null);
      return choice.outcome === 'accepted';
    });
  };
  const installed = () => {
    onAvailable(null);
    onInstalled();
  };
  addEventListener('beforeinstallprompt', onPrompt);
  addEventListener('appinstalled', installed);
  return () => {
    removeEventListener('beforeinstallprompt', onPrompt);
    removeEventListener('appinstalled', installed);
  };
}
