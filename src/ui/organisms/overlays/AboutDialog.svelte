<script lang="ts">
  import Button from '../../atoms/Button.svelte';
  import Dialog from '../../molecules/Dialog.svelte';
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';
  import { FORK_AUTHOR, ORIGINAL } from './credits';

  const app = AppController.use();
  const close = () => (app.ui.overlay = null);
</script>

<Dialog title={t('panels.about.title')} width={480} onclose={close}>
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
  <section class="credits" aria-labelledby="about-credits">
    <h3 id="about-credits">{t('panels.about.credits')}</h3>
    <p>{t('panels.about.forkBy')} <strong>{FORK_AUTHOR.name}</strong></p>
    <ul class="links" aria-label={FORK_AUTHOR.name}>
      <li>
        <a href={FORK_AUTHOR.website} target="_blank" rel="noopener noreferrer">{t('panels.about.website')}</a
        >
      </li>
      {#each FORK_AUTHOR.profiles as profile (profile.href)}
        <li><a href={profile.href} target="_blank" rel="noopener noreferrer">{profile.label}</a></li>
      {/each}
    </ul>
    <p class="muted">
      {t('panels.about.basedOn')}
      <a href={ORIGINAL.href} target="_blank" rel="noopener noreferrer">{ORIGINAL.title}</a>
      {t('panels.about.originalBy', { author: ORIGINAL.author })}
    </p>
  </section>
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
  .credits {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--color-rule);
  }
  h3 {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .credits p {
    margin: 0 0 8px;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
  }
  .links a {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--color-control);
    color: var(--color-text);
    text-decoration: none;
    font-size: 12px;
  }
  .links a:hover {
    border-color: var(--color-muted);
  }
  .muted {
    color: var(--color-muted);
    font-size: 12px;
  }
  .muted a {
    color: var(--color-accent);
  }
</style>
