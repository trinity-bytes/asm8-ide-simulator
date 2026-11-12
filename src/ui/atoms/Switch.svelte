<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    onchange: (value: boolean) => void;
    disabled?: boolean;
    id?: string;
  }
  let { checked, label, onchange, disabled = false, id }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  {id}
  class="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={() => onchange(!checked)}
>
  <span class="knob"></span>
</button>

<style>
  .switch {
    position: relative;
    width: 30px;
    height: 18px;
    border-radius: 999px;
    background: var(--color-control);
    flex: none;
    transition: background-color 150ms var(--ease-out);
  }
  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-muted);
    transition: transform 150ms var(--ease-out);
  }
  .switch[aria-checked='true'] {
    background: var(--color-text);
  }
  .switch[aria-checked='true'] .knob {
    transform: translateX(12px);
    background: var(--color-surface);
  }
  .switch:focus-visible {
    border-radius: 999px;
  }
  .switch:disabled {
    opacity: 0.45;
  }
</style>
