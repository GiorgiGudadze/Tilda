import { describe, expect, it } from 'vitest';
import { percentile } from '@/lib/percentile';

describe('percentile', () => {
  it('is the nearest rank: the 95th smallest of 100', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile(values, 0.95)).toBe(95);
    expect(percentile(values, 0.5)).toBe(50);
  });

  it('is a value from the list, not one between two', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([10, 1000], 0.95)).toBe(1000);
  });

  it('is the one value of one, and null of none', () => {
    expect(percentile([7], 0.95)).toBe(7);
    expect(percentile([7], 0.5)).toBe(7);
    expect(percentile([], 0.5)).toBeNull();
  });
});
