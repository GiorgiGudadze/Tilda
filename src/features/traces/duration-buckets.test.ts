import { describe, expect, it } from 'vitest';
import {
  bucketOf,
  countBuckets,
  DURATION_BUCKETS,
} from '@/features/traces/duration-buckets';

describe('bucketOf', () => {
  it.each([
    [0, 'under-100ms'],
    [99, 'under-100ms'],
    [100, '100-500ms'],
    [499, '100-500ms'],
    [500, '500ms-1s'],
    [999, '500ms-1s'],
    [1000, '1-2s'],
    [1999, '1-2s'],
    [2000, '2-3s'],
    [2999, '2-3s'],
    [3000, 'over-3s'],
    [60_000, 'over-3s'],
  ])('puts %d ms in "%s"', (durationMs, key) => {
    expect(bucketOf(durationMs)).toBe(key);
  });

  it('has ranges that meet with no gap and no overlap', () => {
    for (let i = 1; i < DURATION_BUCKETS.length; i++) {
      expect(DURATION_BUCKETS[i]?.minMs).toBe(DURATION_BUCKETS[i - 1]?.maxMs);
    }
  });
});

describe('countBuckets', () => {
  it('returns every range in order, also the empty ones', () => {
    expect(countBuckets([])).toEqual([
      { key: 'under-100ms', count: 0 },
      { key: '100-500ms', count: 0 },
      { key: '500ms-1s', count: 0 },
      { key: '1-2s', count: 0 },
      { key: '2-3s', count: 0 },
      { key: 'over-3s', count: 0 },
    ]);
  });

  it('counts each duration once', () => {
    const counts = countBuckets([10, 20, 150, 1000, 1500, 2900, 9000]);
    expect(counts.map((bucket) => bucket.count)).toEqual([2, 1, 0, 2, 1, 1]);
  });
});
