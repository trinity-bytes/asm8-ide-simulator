import type { Settings, SettingsRepository } from '@app/settings/settings';

/** Container: reactive settings, saved on every change. */
export class SettingsState {
  value = $state<Settings>() as Settings;

  constructor(private readonly repo: SettingsRepository) {
    this.value = repo.load();
  }

  set<K extends keyof Settings>(key: K, v: Settings[K]): void {
    this.value = { ...this.value, [key]: v };
    this.repo.save($state.snapshot(this.value) as Settings);
  }
}
