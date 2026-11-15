import { bucketOf, countBuckets } from '@/features/traces/duration-buckets';
import {
  PAGE_SIZE,
  type TraceList,
  type TraceListParams,
} from '@/features/traces/schemas';
import type { Dataset } from '@/mocks/seed';

/**
 * What a real server would do for `GET /api/traces`: filter, count, sort and
 * cut one page. It is a pure function so it can be tested without a network.
 */
export function queryTraces(
  dataset: Dataset,
  params: TraceListParams,
): TraceList {
  const text = params.q.trim().toLowerCase();

  // Every filter except the duration range.
  const matches = dataset.traces.filter((trace) => {
    if (params.status && trace.status !== params.status) {
      return false;
    }
    if (
      text &&
      !trace.operation.toLowerCase().includes(text) &&
      !trace.id.toLowerCase().includes(text)
    ) {
      return false;
    }
    if (params.service) {
      const spans = dataset.spansByTraceId.get(trace.id) ?? [];
      return spans.some((span) => span.service === params.service);
    }
    return true;
  });

  // The chart counts ignore the selected bar, so the other bars stay visible.
  const buckets = countBuckets(matches.map((trace) => trace.durationMs));

  const filtered = params.duration
    ? matches.filter((trace) => bucketOf(trace.durationMs) === params.duration)
    : matches;

  // The dataset is newest first already. Sorting is stable, so traces of
  // equal duration stay newest first.
  const sorted =
    params.sort === 'slowest'
      ? [...filtered].sort((a, b) => b.durationMs - a.durationMs)
      : filtered;

  const lastPage = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(params.page, lastPage);

  return {
    items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    buckets,
  };
}

/** Every service that takes part in any trace, in alphabetical order. */
export function listServices(dataset: Dataset): string[] {
  const services = new Set<string>();
  for (const spans of dataset.spansByTraceId.values()) {
    for (const span of spans) {
      services.add(span.service);
    }
  }
  return [...services].sort();
}
