<script lang="ts">
  import { displayKeys } from '../state/commands';

  interface Props {
    keys: string;
  }
  let { keys }: Props = $props();
</script>

<kbd>{displayKeys(keys)}</kbd>

<style>
  kbd {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-muted);
    white-space: nowrap;
  }
</style>
