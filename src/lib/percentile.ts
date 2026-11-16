/**
 * The value that `share` (0 to 1) of `sorted` is at or below, by nearest
 * rank: for 100 values, the 95th percentile is the 95th smallest. It is a
 * value from the list, never one made up between two. `null` for no values.
 */
export function percentile(sorted: number[], share: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const rank = Math.max(1, Math.ceil(share * sorted.length));
  return sorted[rank - 1] ?? null;
}
