<script lang="ts">
  import { onMount } from 'svelte';
  import { BrowserWorkspaceProvider } from '@adapters/fs/browser-workspace-provider';
  import { createRunner } from '@adapters/runner/worker-runner';
  import { LocalSettingsRepository } from '@adapters/storage/local-settings';
  import { setupInstall } from '@adapters/pwa/install';
  import Overlays from './organisms/overlays/Overlays.svelte';
  import PhoneWorkbench from './screens/PhoneWorkbench.svelte';
  import Workbench from './screens/Workbench.svelte';
  import { AppController } from './state/app.svelte';
  import type { Layout } from './state/ui.svelte';

  // Composition root: the only place that knows which adapters implement the ports.
  const app = new AppController({
    runner: createRunner(),
    provider: new BrowserWorkspaceProvider(),
    settingsRepo: new LocalSettingsRepository(),
  });
  AppController.provide(app);

  const QUERIES: [Layout, string][] = [
    ['phone', '(max-width: 640px)'],
    ['tablet-portrait', '(max-width: 1023px) and (orientation: portrait)'],
    ['tablet-landscape', '(max-width: 1279px), (pointer: coarse) and (max-width: 1366px)'],
  ];

  function pickLayout(): Layout {
    for (const [layout, q] of QUERIES) if (matchMedia(q).matches) return layout;
    return 'desktop';
  }

  onMount(() => {
    app.setLayout(pickLayout());
    const lists = QUERIES.map(([, q]) => matchMedia(q));
    const onLayout = () => app.setLayout(pickLayout());
    lists.forEach((l) => l.addEventListener('change', onLayout));

    void app.start();

    const onKey = (e: KeyboardEvent) => {
      // Overlays handle their own keys; the editor keeps Ctrl+F, Ctrl+Z, etc.
      if (app.ui.overlay || app.ui.confirmRequest) return;
      app.keymap.handle(e);
    };
    const onFocus = () => void app.workspace.checkDisk();
    const onOnline = () => (app.ui.online = navigator.onLine);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (app.workspace.dirtyTabs.length && app.workspace.fs?.kind !== 'examples') e.preventDefault();
    };
    addEventListener('keydown', onKey);
    addEventListener('focus', onFocus);
    addEventListener('online', onOnline);
    addEventListener('offline', onOnline);
    addEventListener('beforeunload', onBeforeUnload);
    onOnline();
    const stopInstall = setupInstall(
      (prompt) => app.setInstallPrompt(prompt),
      () => (app.installed = true),
    );

    return () => {
      lists.forEach((l) => l.removeEventListener('change', onLayout));
      removeEventListener('keydown', onKey);
      removeEventListener('focus', onFocus);
      removeEventListener('online', onOnline);
      removeEventListener('offline', onOnline);
      removeEventListener('beforeunload', onBeforeUnload);
      stopInstall();
      app.session.dispose();
    };
  });

  // Surface file errors as toasts.
  $effect(() => {
    const err = app.workspace.error;
    if (err) {
      app.ui.toast(err, 'negative');
      app.workspace.error = null;
    }
  });
</script>

{#if app.ui.layout === 'phone'}
  <PhoneWorkbench />
{:else}
  <Workbench />
{/if}
<Overlays />
