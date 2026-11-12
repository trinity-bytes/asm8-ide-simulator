<script lang="ts">
  interface Props {
    name: string;
    value: string;
    second: string;
    note: string;
    changed?: boolean;
    onclick?: () => void;
  }
  let { name, value, second, note, changed = false, onclick }: Props = $props();
</script>

<button type="button" class="reg" class:changed {onclick}>
  <span class="name mono">{name}</span>
  <span class="value mono">{value}</span>
  <span class="second mono">{second}</span>
  <span class="note mono">{note}</span>
  {#if changed}<span class="sr-only">changed</span>{/if}
</button>

<style>
  .reg {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1.2fr 0.8fr 1.6fr;
    align-items: center;
    width: 100%;
    height: 28px;
    padding: 0 12px;
    border-bottom: 1px solid var(--color-rule);
    text-align: left;
  }
  .reg:last-child {
    border-bottom: 0;
  }
  .reg:hover {
    background: var(--color-raised);
  }
  .changed::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 7px;
    bottom: 7px;
    width: 1px;
    background: var(--color-text);
  }
  .name {
    font-weight: 500;
    font-size: 13px;
  }
  .value {
    font-size: 13px;
  }
  .changed .value {
    color: var(--color-accent);
  }
  .second {
    text-align: right;
    color: var(--color-muted);
    font-size: 12px;
  }
  .note {
    text-align: right;
    color: var(--color-muted);
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
