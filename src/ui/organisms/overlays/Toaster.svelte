<script lang="ts">
  import Icon from '../../atoms/Icon.svelte';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const ICON = { info: 'info', positive: 'success', negative: 'warning' } as const;
</script>

<div class="toaster" role="region" aria-label="Notifications" aria-live="polite">
  {#each app.ui.toasts as t (t.id)}
    <div class="toast {t.tone}">
      <Icon name={ICON[t.tone]} size={16} />
      <span>{t.text}</span>
      {#if t.action}
        <button
          type="button"
          onclick={() => {
            t.action!.run();
            app.ui.dismiss(t.id);
          }}>{t.action.label}</button
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .toaster {
    position: fixed;
    z-index: 70;
    right: 16px;
    bottom: 40px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    max-width: min(420px, calc(100vw - 32px));
    padding: 6px 8px 6px 12px;
    border-radius: 8px;
    background: var(--color-raised);
    box-shadow: var(--shadow-pop);
    pointer-events: auto;
  }
  @media (prefers-reduced-motion: no-preference) {
    .toast {
      animation: rise 180ms var(--ease-out);
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  .positive :global(.icon) {
    color: var(--color-positive);
  }
  .negative :global(.icon) {
    color: var(--color-negative);
  }
  .info :global(.icon) {
    color: var(--color-muted);
  }
  span {
    flex: 1;
  }
  button {
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--color-control);
    font-weight: 500;
  }
  button:hover {
    background: var(--color-control);
  }
  /* Phone: below the top bar, so the step bar and bottom navigation stay usable. */
  @media (max-width: 640px) {
    .toaster {
      left: 16px;
      right: 16px;
      top: calc(72px + env(safe-area-inset-top));
      bottom: auto;
    }
  }
</style>
