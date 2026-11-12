import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the offline service worker. `onUpdate` receives a function that activates a new
 * version (the UI asks first, so unsaved work is never reloaded away).
 */
export function registerServiceWorker(
  onUpdate: (apply: () => void) => void,
  onOfflineReady: () => void,
): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const update = registerSW({
    onNeedRefresh: () => onUpdate(() => void update(true)),
    onOfflineReady,
  });
}
