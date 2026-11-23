<script lang="ts">
  import { dragSize, keySize, type Grow } from './resize';

  interface Props {
    /** Current size of the pane this edge resizes, in px. */
    size: number;
    min: number;
    max: number;
    /** Size restored on double click. */
    initial: number;
    /** `x` resizes a width (vertical bar), `y` a height (horizontal bar). */
    axis: 'x' | 'y';
    /** `1` when moving right/down grows the pane, `-1` when moving left/up does. */
    grow: Grow;
    label: string;
    onresize: (size: number) => void;
  }
  let { size, min, max, initial, axis, grow, label, onresize }: Props = $props();

  function onpointerdown(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const from = axis === 'x' ? e.clientX : e.clientY;
    const start = size;
    el.setPointerCapture(e.pointerId);
    document.body.classList.add(axis === 'x' ? 'resizing-x' : 'resizing-y');
    const move = (ev: PointerEvent) =>
      onresize(dragSize({ start, from, to: axis === 'x' ? ev.clientX : ev.clientY, grow, min, max }));
    const up = () => {
      document.body.classList.remove('resizing-x', 'resizing-y');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function onkeydown(e: KeyboardEvent) {
    const next = keySize(e.key, size, { axis, grow, min, max });
    if (next === null) return;
    e.preventDefault();
    onresize(next);
  }
</script>

<!-- A focusable separator is a widget (resize with arrow keys, Home/End, double click resets). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="resizer {axis}"
  role="separator"
  aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
  aria-label={label}
  aria-valuenow={size}
  aria-valuemin={min}
  aria-valuemax={max}
  tabindex="0"
  {onpointerdown}
  {onkeydown}
  ondblclick={() => onresize(initial)}
></div>

<style>
  .resizer {
    position: relative;
    z-index: 2;
    flex: none;
    touch-action: none;
  }
  .x {
    width: 0;
    cursor: ew-resize;
  }
  .y {
    height: 0;
    cursor: ns-resize;
  }
  /* Invisible 6px hit area centred on the edge. */
  .resizer::after {
    content: '';
    position: absolute;
  }
  .x::after {
    top: 0;
    bottom: 0;
    left: -3px;
    width: 6px;
  }
  .y::after {
    left: 0;
    right: 0;
    top: -3px;
    height: 6px;
  }
  .resizer:hover::before,
  .resizer:focus-visible::before {
    content: '';
    position: absolute;
    background: var(--color-accent);
  }
  .x:hover::before,
  .x:focus-visible::before {
    top: 0;
    bottom: 0;
    left: -1px;
    width: 2px;
  }
  .y:hover::before,
  .y:focus-visible::before {
    left: 0;
    right: 0;
    top: -1px;
    height: 2px;
  }
  .resizer:focus-visible {
    box-shadow: none;
  }
  /* Keep the cursor and stop text selection while dragging over other elements. */
  :global(body.resizing-x),
  :global(body.resizing-y) {
    user-select: none;
  }
  :global(body.resizing-x) {
    cursor: ew-resize;
  }
  :global(body.resizing-y) {
    cursor: ns-resize;
  }
</style>
