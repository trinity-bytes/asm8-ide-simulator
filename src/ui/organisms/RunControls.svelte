<script lang="ts">
  import { SPEEDS, speedLabel } from '@app/run/protocol';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';
  import IconButton from '../atoms/IconButton.svelte';
  import { AppController } from '../state/app.svelte';

  interface Props {
    /** Tablet: 40px targets. Phone: only Run and Step. */
    touch?: boolean;
    minimal?: boolean;
  }
  let { touch = false, minimal = false }: Props = $props();

  const app = AppController.use();
  const s = app.session;
  const size = $derived(touch ? 'lg' : 'md');

  const primary = $derived.by(() => {
    if (s.running) return { label: 'Pause', icon: 'pause' as const };
    if (s.state === 'paused' || s.state === 'waiting') return { label: 'Continue', icon: 'play' as const };
    return { label: 'Run', icon: 'play' as const };
  });
  const canRun = $derived(app.workspace.activeFile !== null || s.program !== null);
  const canReset = $derived(s.state !== 'empty' && s.state !== 'ready');

  function openSpeedMenu(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    app.ui.openMenu(
      r.left,
      r.bottom + 4,
      SPEEDS.map((sp) => ({
        label: `${speedLabel(sp)}${sp === 'max' ? ' · screen every 100 ms' : ''}`,
        checked: s.speed === sp,
        run: () => app.setSpeed(sp),
      })),
    );
  }
</script>

<div class="controls" role="toolbar" aria-label="Run controls">
  <Button variant="primary" {size} icon={primary.icon} disabled={!canRun} onclick={() => app.toggleRun()}>
    {primary.label}
  </Button>
  {#if !minimal}
    <Button {size} icon="step" disabled={!canRun || s.running} onclick={() => app.step()}>Step</Button>
    <Button {size} icon="reset" disabled={!canReset} onclick={() => app.reset()}>Reset</Button>
    <Button {size} onclick={openSpeedMenu} aria-haspopup="menu" aria-label="Speed {speedLabel(s.speed)}">
      {touch ? speedLabel(s.speed) : `Speed ${speedLabel(s.speed)}`}
      <Icon name="chevronDown" size={14} />
    </Button>
  {:else}
    <IconButton
      icon="step"
      label="Step"
      size="touch"
      disabled={!canRun || s.running}
      onclick={() => app.step()}
    />
  {/if}
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .controls :global(.icon) {
    margin-right: -2px;
  }
</style>
