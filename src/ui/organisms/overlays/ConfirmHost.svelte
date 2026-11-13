<script lang="ts">
  import Button from '../../atoms/Button.svelte';
  import Dialog from '../../molecules/Dialog.svelte';
  import { t } from '../../i18n/i18n.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const req = $derived(app.ui.confirmRequest);
</script>

{#if req}
  <Dialog
    title={req.title}
    onclose={() => req.resolve('cancel')}
    initialFocus={req.danger ? '[data-cancel]' : '[data-confirm]'}
  >
    <p>{req.body}</p>
    {#snippet actions()}
      <Button variant="ghost" data-cancel onclick={() => req.resolve('cancel')}>{t('common.cancel')}</Button>
      {#if req.alternate}<Button onclick={() => req.resolve('alternate')}>{req.alternate}</Button>{/if}
      <Button variant={req.danger ? 'danger' : 'primary'} data-confirm onclick={() => req.resolve('confirm')}
        >{req.confirm}</Button
      >
    {/snippet}
  </Dialog>
{/if}

<style>
  p {
    margin: 4px 0 0;
    line-height: 1.5;
  }
</style>
