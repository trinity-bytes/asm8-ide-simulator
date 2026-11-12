<script lang="ts">
  import { ICONS, type IconName } from './icons';

  interface Props {
    name: IconName;
    size?: number;
    /** Accessible name; omit for decorative icons next to a text label. */
    label?: string;
  }
  let { name, size = 16, label }: Props = $props();
  const Glyph = $derived(ICONS[name]);
</script>

<Glyph
  {size}
  strokeWidth={1.75}
  aria-hidden={label ? undefined : 'true'}
  aria-label={label}
  role={label ? 'img' : undefined}
  class="icon"
/>

<style>
  :global(.icon) {
    flex: none;
  }
</style>
