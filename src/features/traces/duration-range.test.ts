import { describe, expect, it } from 'vitest';
import {
  inDurationRange,
  isEmptyRange,
} from '@/features/traces/duration-range';

describe('inDurationRange', () => {
  it.each([
    [99, { minMs: 100, maxMs: 500 }, false],
    [100, { minMs: 100, maxMs: 500 }, true],
    [500, { minMs: 100, maxMs: 500 }, true],
    [501, { minMs: 100, maxMs: 500 }, false],
    [0, { minMs: null, maxMs: null }, true],
    [9000, { minMs: 3000, maxMs: null }, true],
    [5, { minMs: null, maxMs: 99 }, true],
    [300, { minMs: 500, maxMs: 200 }, false],
  ])('puts %d ms inside %o: %s', (durationMs, range, expected) => {
    expect(inDurationRange(durationMs, range)).toBe(expected);
  });
});

describe('isEmptyRange', () => {
  it('is true only when the max is below the min', () => {
    expect(isEmptyRange({ minMs: 500, maxMs: 200 })).toBe(true);
    expect(isEmptyRange({ minMs: 500, maxMs: 500 })).toBe(false);
    expect(isEmptyRange({ minMs: 500, maxMs: null })).toBe(false);
    expect(isEmptyRange({ minMs: null, maxMs: null })).toBe(false);
  });
});
