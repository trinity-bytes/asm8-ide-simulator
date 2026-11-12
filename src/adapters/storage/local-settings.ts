import { sanitizeSettings, type Settings, type SettingsRepository } from '@app/settings/settings';

const KEY = 'asm8.settings.v1';

/** Settings in localStorage. Every access is guarded: private windows may throw. */
export class LocalSettingsRepository implements SettingsRepository {
  load(): Settings {
    try {
      return sanitizeSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
    } catch {
      return sanitizeSettings(null);
    }
  }

  save(settings: Settings): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Not persisted (private mode or quota); the app keeps working with in-memory settings.
    }
  }
}
