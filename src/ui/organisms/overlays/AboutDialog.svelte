<script lang="ts">
  import Button from '../../atoms/Button.svelte';
  import Dialog from '../../molecules/Dialog.svelte';
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const close = () => (app.ui.overlay = null);
</script>

<Dialog title={t('panels.about.title')} onclose={close}>
  <p class="v mono">{t('panels.about.version', { version: __APP_VERSION__ })}</p>
  <p>
    {t('panels.about.description')}
  </p>
  <ul>
    <li>
      {app.ui.online ? t('panels.about.online') : t('panels.about.offline')} · {app.installed
        ? t('panels.about.installed')
        : t('panels.about.browser')}
    </li>
    <li>{t('panels.about.worksOffline')}</li>
    <li>
      {t('panels.about.files', {
        where: app.workspace.provider.canOpenFolders
          ? t('panels.about.filesFolders')
          : t('panels.about.filesBrowser'),
      })}
    </li>
  </ul>
  {#snippet actions()}
    {#if app.installAvailable}<Button onclick={() => app.install()}>{t('panels.about.install')}</Button>{/if}
    <Button variant="primary" onclick={close}>{t('common.close')}</Button>
  {/snippet}
</Dialog>

<style>
  p,
  li {
    line-height: 1.5;
  }
  .v {
    color: var(--color-text);
  }
  ul {
    padding-left: 18px;
  }
</style>
