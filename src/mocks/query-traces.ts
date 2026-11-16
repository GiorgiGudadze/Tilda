import { inDurationRange } from '@/features/traces/duration-range';
import { type TraceSummary } from '@/lib/trace-model';
import {
  MAX_VOLUME_BARS,
  PAGE_SIZE,
  POINT_LIMIT,
  type TraceList,
  type TraceListParams,
  type TracePoints,
  type TracePointsParams,
  type TraceVolume,
  type TraceVolumeParams,
} from '@/features/traces/schemas';
import { volumeStep } from '@/lib/scales';
import { inRange, resolveBound } from '@/lib/time-range';
import { type Dataset, SEED_NOW } from '@/mocks/seed';

/** The filters that have counts of their own in the response. */
type Facet = 'name' | 'duration';

/**
 * Whether a trace passes every filter in `params`, apart from `skip`.
 * Skipping one filter is how its own counts are made: the counts for the
 * request names apply every filter except the name.
 */
function passes(
  dataset: Dataset,
  trace: TraceSummary,
  params: TracePointsParams & Partial<Pick<TraceListParams, 'minMs' | 'maxMs'>>,
  skip?: Facet,
): boolean {
  const text = params.q.trim().toLowerCase();
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
  if (
    skip !== 'name' &&
    params.name.length > 0 &&
    !params.name.includes(trace.operation)
  ) {
    return false;
  }
  // A missing end is open. The mock's clock is the seed's "now", as a
  // server would use its own.
  if (
    (params.from || params.to) &&
    !inRange(
      Date.parse(trace.startedAt),
      { from: params.from ?? '1970-01-01 00:00', to: params.to ?? 'now' },
      SEED_NOW,
    )
  ) {
    return false;
  }
  if (
    skip !== 'duration' &&
    !inDurationRange(trace.durationMs, {
      minMs: params.minMs ?? null,
      maxMs: params.maxMs ?? null,
    })
  ) {
    return false;
  }
  if (params.service) {
    const spans = dataset.spansByTraceId.get(trace.id) ?? [];
    return spans.some((span) => span.service === params.service);
  }
  return true;
}

function filterTraces(
  dataset: Dataset,
  params: Parameters<typeof passes>[2],
  skip?: Facet,
): TraceSummary[] {
  return dataset.traces.filter((trace) => passes(dataset, trace, params, skip));
}

/**
 * What a real server would do for `GET /api/traces`: filter, count, sort and
 * cut one page. It is a pure function so it can be tested without a network.
 */
export function queryTraces(
  dataset: Dataset,
  params: TraceListParams,
): TraceList {
  const filtered = filterTraces(dataset, params);

  // The name counts ignore the name filter, so the other names keep their
  // counts while one is picked.
  const byName = new Map<string, number>();
  for (const trace of filterTraces(dataset, params, 'name')) {
    byName.set(trace.operation, (byName.get(trace.operation) ?? 0) + 1);
  }
  const names = listNames(dataset).map((name) => ({
    name,
    count: byName.get(name) ?? 0,
  }));

  // The dataset is newest first already. Sorting is stable, so traces of
  // equal duration stay newest first.
  const sorted =
    params.sort === 'oldest'
      ? [...filtered].reverse()
      : params.sort === 'slowest'
        ? [...filtered].sort((a, b) => b.durationMs - a.durationMs)
        : params.sort === 'fastest'
          ? [...filtered].sort((a, b) => a.durationMs - b.durationMs)
          : filtered;

  const lastPage = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(params.page, lastPage);

  return {
    items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    facets: { names },
  };
}

/** Every request name in the data, in alphabetical order. */
function listNames(dataset: Dataset): string[] {
  return [...new Set(dataset.traces.map((trace) => trace.operation))].sort();
}

/**
 * What a real server would do for `GET /api/traces/points`: the matching
 * traces as dots, newest first. A plot is never unbounded: past `limit`
 * only the newest are sent, and `total` says how many there were.
 */
export function queryTracePoints(
  dataset: Dataset,
  params: TracePointsParams,
  limit = POINT_LIMIT,
): TracePoints {
  // Like the bar counts, the plot ignores the duration range.
  const matches = filterTraces(dataset, params, 'duration');
  return {
    points: matches
      .slice(0, limit)
      .map(({ id, operation, startedAt, durationMs, status }) => ({
        id,
        operation,
        startedAt,
        durationMs,
        status,
      })),
    total: matches.length,
  };
}

/**
 * What a real server would do for `GET /api/traces/volume`: how many traces
 * started in each step of time, split by status. It applies every filter.
 *
 * The chart spans the range asked for, with relative bounds read on the
 * server's clock. An open end goes to the oldest trace or to "now". The step
 * is the smallest round one that keeps the bars to `maxBars`, so the
 * response stays small whatever the range.
 */
export function queryTraceVolume(
  dataset: Dataset,
  params: TraceVolumeParams,
  maxBars = MAX_VOLUME_BARS,
): TraceVolume {
  // The dataset is newest first, so the oldest trace is the last.
  const oldest = dataset.traces.at(-1);
  const bound = (text: string | undefined) =>
    text === undefined ? null : resolveBound(text, SEED_NOW);
  const fromMs =
    bound(params.from) ?? (oldest ? Date.parse(oldest.startedAt) : SEED_NOW);
  const toMs = bound(params.to) ?? SEED_NOW;
  const iso = (ms: number) => new Date(ms).toISOString();

  // A range the wrong way round has nothing in it.
  if (toMs <= fromMs) {
    return { from: iso(fromMs), to: iso(toMs), stepMs: 60_000, bars: [] };
  }

  const stepMs = volumeStep(toMs - fromMs, maxBars);
  const firstMs = Math.floor(fromMs / stepMs) * stepMs;
  const bars = [];
  for (let start = firstMs; start < toMs; start += stepMs) {
    bars.push({ start: iso(start), ok: 0, error: 0 });
  }
  for (const trace of filterTraces(dataset, params)) {
    const index = Math.floor((Date.parse(trace.startedAt) - firstMs) / stepMs);
    const bar = bars[index];
    if (bar) {
      bar[trace.status] += 1;
    }
  }
  return { from: iso(fromMs), to: iso(toMs), stepMs, bars };
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
