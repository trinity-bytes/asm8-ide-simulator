import { describe, expect, it } from 'vitest';
import { dragSize, keySize } from './resize';

const bounds = { min: 180, max: 480 };

describe('dragSize', () => {
  it('grows a left-anchored pane when dragging right', () => {
    expect(dragSize({ start: 248, from: 500, to: 560, grow: 1, ...bounds })).toBe(308);
  });

  it('grows a right-anchored pane when dragging left', () => {
    expect(dragSize({ start: 384, from: 1000, to: 900, grow: -1, min: 340, max: 640 })).toBe(484);
  });

  it('never goes past the bounds', () => {
    expect(dragSize({ start: 248, from: 500, to: 0, grow: 1, ...bounds })).toBe(180);
    expect(dragSize({ start: 248, from: 500, to: 2000, grow: 1, ...bounds })).toBe(480);
  });
});

describe('keySize', () => {
  it('moves 24px per arrow key along the separator axis', () => {
    expect(keySize('ArrowRight', 248, { axis: 'x', grow: 1, ...bounds })).toBe(272);
    expect(keySize('ArrowLeft', 248, { axis: 'x', grow: 1, ...bounds })).toBe(224);
    expect(keySize('ArrowLeft', 384, { axis: 'x', grow: -1, min: 340, max: 640 })).toBe(408);
    expect(keySize('ArrowUp', 272, { axis: 'y', grow: -1, min: 120, max: 600 })).toBe(296);
  });

  it('jumps to the bounds with Home and End, clamping arrows too', () => {
    expect(keySize('Home', 300, { axis: 'x', grow: 1, ...bounds })).toBe(180);
    expect(keySize('End', 300, { axis: 'x', grow: 1, ...bounds })).toBe(480);
    expect(keySize('ArrowRight', 470, { axis: 'x', grow: 1, ...bounds })).toBe(480);
  });

  it('ignores keys across the axis', () => {
    expect(keySize('ArrowUp', 248, { axis: 'x', grow: 1, ...bounds })).toBeNull();
    expect(keySize('a', 248, { axis: 'x', grow: 1, ...bounds })).toBeNull();
  });
});
