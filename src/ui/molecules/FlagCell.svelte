<script lang="ts">
  import { t } from '../i18n/i18n.svelte';

  interface Props {
    name: string;
    on: boolean;
    changed?: boolean;
  }
  let { name, on, changed = false }: Props = $props();
</script>

<div class="flag" class:changed>
  <span class="name">{name}</span>
  <span class="value mono" aria-label={t(on ? 'shell.flag.set' : 'shell.flag.clear', { name })}
    >{on ? 1 : 0}</span
  >
</div>

<style>
  .flag {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border-right: 1px solid var(--color-rule);
    flex: 1;
  }
  .flag:last-child {
    border-right: 0;
  }
  .name {
    font-size: 12px;
    color: var(--color-muted);
  }
  .value {
    font-size: 20px;
    font-weight: 500;
    color: var(--color-muted);
  }
  .flag:has(.value[aria-label$='set']) .value {
    color: var(--color-text);
  }
  .changed .value {
    color: var(--color-accent);
  }
</style>
