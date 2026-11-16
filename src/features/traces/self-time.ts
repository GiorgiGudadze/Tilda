import type { Span } from '@/lib/trace-model';

/**
 * Self time: how long a span worked itself, without the time it spent
 * waiting for its children. It is the span's duration minus the time covered
 * by its children.
 *
 * Children can overlap (two calls at once), so their time is counted as a
 * union, not a sum. A child is clipped to its parent's interval first, so
 * bad data cannot make a self time negative.
 */
export function selfTimes(spans: Span[]): Map<string, number> {
  const childrenByParent = new Map<string, Span[]>();
  for (const span of spans) {
    if (span.parentId !== null) {
      const siblings = childrenByParent.get(span.parentId) ?? [];
      siblings.push(span);
      childrenByParent.set(span.parentId, siblings);
    }
  }

  const result = new Map<string, number>();
  for (const span of spans) {
    const start = span.startMs;
    const end = span.startMs + span.durationMs;

    const intervals = (childrenByParent.get(span.id) ?? [])
      .map((child) => ({
        from: Math.max(child.startMs, start),
        to: Math.min(child.startMs + child.durationMs, end),
      }))
      .filter((interval) => interval.to > interval.from)
      .sort((a, b) => a.from - b.from);

    // Walk the intervals from left to right. `coveredUntil` is how far the
    // children seen so far reach, so an overlap is not counted twice.
    let covered = 0;
    let coveredUntil = start;
    for (const interval of intervals) {
      if (interval.to > coveredUntil) {
        covered += interval.to - Math.max(interval.from, coveredUntil);
        coveredUntil = interval.to;
      }
    }

    result.set(span.id, span.durationMs - covered);
  }
  return result;
}

/**
 * The span with the largest self time: the step where the time went.
 * On equal self time the span that started earlier wins.
 */
export function slowestSpanId(
  spans: Span[],
  selfMsById: Map<string, number> = selfTimes(spans),
): string | null {
  // Sorting is stable, so spans that start together keep their order.
  const byStart = [...spans].sort((a, b) => a.startMs - b.startMs);

  let slowest: Span | undefined;
  let slowestMs = -1;
  for (const span of byStart) {
    const selfMs = selfMsById.get(span.id) ?? 0;
    if (selfMs > slowestMs) {
      slowest = span;
      slowestMs = selfMs;
    }
  }
  return slowest?.id ?? null;
}
