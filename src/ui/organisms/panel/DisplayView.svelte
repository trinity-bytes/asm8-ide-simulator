<script lang="ts">
  import { DISPLAY_SIZE, DISPLAY_START, hex } from '@core/index';
  import { AppController } from '../../state/app.svelte';

  const app = AppController.use();
  const cells = $derived.by(() => {
    const mem = app.session.snapshot?.memory;
    return Array.from({ length: DISPLAY_SIZE }, (_, i) => mem?.[DISPLAY_START + i] ?? 0);
  });
  const text = $derived(app.session.displayText());
</script>

<div class="display">
  <div class="screen" role="img" aria-label="Display: {text || 'empty'}">
    {#each cells as b, i (i)}
      <div class="cell" class:empty={b === 0}>
        <span class="ch mono">{b >= 32 && b < 127 ? String.fromCharCode(b) : b === 0 ? '·' : '?'}</span>
        <span class="addr mono">{hex(DISPLAY_START + i)}</span>
      </div>
    {/each}
  </div>
  <p class="note">
    Memory-mapped display: bytes 0xE8–0xFF. Write a character code there, e.g. <code class="mono"
      >MOV [232], 'H'</code
    >. For longer output use <code class="mono">OUT</code> and the console.
  </p>
</div>

<style>
  .display {
    height: 100%;
    overflow: auto;
    padding: 16px;
  }
  .screen {
    display: grid;
    grid-template-columns: repeat(12, minmax(28px, 1fr));
    gap: 4px;
    max-width: 640px;
    padding: 12px;
    border-radius: 8px;
    background: var(--color-ground);
    border: 1px solid var(--color-rule);
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 0 4px;
    border-radius: 4px;
    background: var(--color-raised);
  }
  .ch {
    font-size: 20px;
    font-weight: 500;
    line-height: 1;
  }
  .empty .ch {
    color: var(--color-muted);
  }
  .addr {
    font-size: 10px;
    color: var(--color-muted);
  }
  .note {
    max-width: 640px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 1.5;
  }
  code {
    color: var(--color-text);
  }
</style>
