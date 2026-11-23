/** Size limits of a resizable pane, in px. */
export interface SizeBounds {
  readonly min: number;
  readonly max: number;
}

/** `1` when moving the pointer right/down grows the pane, `-1` when moving it left/up does. */
export type Grow = 1 | -1;

export const KEY_STEP = 24;

const clamp = (v: number, { min, max }: SizeBounds) => Math.round(Math.max(min, Math.min(max, v)));

/** Size of a pane after dragging its edge from `from` to `to` (pointer coordinates). */
export function dragSize(o: SizeBounds & { start: number; from: number; to: number; grow: Grow }): number {
  return clamp(o.start + (o.to - o.from) * o.grow, o);
}

/** Size after a key press on the separator, or `null` when the key does not resize. */
export function keySize(
  key: string,
  size: number,
  o: SizeBounds & { axis: 'x' | 'y'; grow: Grow },
): number | null {
  if (key === 'Home') return o.min;
  if (key === 'End') return o.max;
  const forward = o.axis === 'x' ? 'ArrowRight' : 'ArrowDown';
  const back = o.axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
  if (key === forward) return clamp(size + KEY_STEP * o.grow, o);
  if (key === back) return clamp(size - KEY_STEP * o.grow, o);
  return null;
}
