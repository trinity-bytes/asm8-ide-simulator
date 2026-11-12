<script lang="ts">
  import type { RunState } from '@app/run/protocol';

  interface Props {
    state: RunState;
  }
  let { state }: Props = $props();

  const LABELS: Record<RunState, string> = {
    empty: 'Ready',
    ready: 'Ready',
    running: 'Running',
    paused: 'Paused',
    waiting: 'Waiting for input',
    halted: 'Halted',
    fault: 'Error',
  };
</script>

<span class="pill {state}" role="status">
  <span class="dot" aria-hidden="true"></span>{LABELS[state]}
</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--color-raised);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-muted);
  }
  .running .dot {
    background: var(--color-positive);
  }
  .paused .dot {
    background: var(--color-warning);
  }
  .waiting .dot {
    background: var(--color-accent);
  }
  .fault .dot {
    background: var(--color-negative);
  }
  @media (prefers-reduced-motion: no-preference) {
    .running .dot,
    .waiting .dot {
      animation: pulse 1.6s ease-in-out infinite;
    }
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
</style>
