/**
 * The fixed duration ranges of the chart. A range includes its lower bound
 * and excludes its upper bound, so every duration is in exactly one range.
 */
export const DURATION_BUCKETS = [
  { key: 'under-100ms', label: 'Under 100 ms', minMs: 0, maxMs: 100 },
  { key: '100-500ms', label: '100 to 500 ms', minMs: 100, maxMs: 500 },
  { key: '500ms-1s', label: '500 ms to 1 s', minMs: 500, maxMs: 1000 },
  { key: '1-2s', label: '1 to 2 s', minMs: 1000, maxMs: 2000 },
  { key: '2-3s', label: '2 to 3 s', minMs: 2000, maxMs: 3000 },
  { key: 'over-3s', label: '3 s or more', minMs: 3000, maxMs: Infinity },
] as const;

export type DurationBucketKey = (typeof DURATION_BUCKETS)[number]['key'];

export const DURATION_BUCKET_KEYS = DURATION_BUCKETS.map(
  (bucket) => bucket.key,
) as [DurationBucketKey, ...DurationBucketKey[]];

/** The range a duration falls in. */
export function bucketOf(durationMs: number): DurationBucketKey {
  const bucket = DURATION_BUCKETS.find(
    (candidate) =>
      durationMs >= candidate.minMs && durationMs < candidate.maxMs,
  );
  // Only a negative duration matches no range. Treat it as the shortest.
  return bucket?.key ?? DURATION_BUCKETS[0].key;
}

/** How many durations fall in each range, in the fixed order of the ranges. */
export function countBuckets(
  durationsMs: number[],
): { key: DurationBucketKey; count: number }[] {
  const counts = new Map<DurationBucketKey, number>();
  for (const durationMs of durationsMs) {
    const key = bucketOf(durationMs);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return DURATION_BUCKETS.map((bucket) => ({
    key: bucket.key,
    count: counts.get(bucket.key) ?? 0,
  }));
}
