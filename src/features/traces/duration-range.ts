/**
 * A duration filter, in whole milliseconds. Both ends are included, as a
 * person reads "min 100, max 500". `null` leaves that end open.
 */
export interface DurationRange {
  minMs: number | null;
  maxMs: number | null;
}

/** Whether a duration is inside the range. */
export function inDurationRange(
  durationMs: number,
  { minMs, maxMs }: DurationRange,
): boolean {
  return (
    (minMs === null || durationMs >= minMs) &&
    (maxMs === null || durationMs <= maxMs)
  );
}

/** A range that nothing can be in: the max is below the min. */
export function isEmptyRange({ minMs, maxMs }: DurationRange): boolean {
  return minMs !== null && maxMs !== null && maxMs < minMs;
}
