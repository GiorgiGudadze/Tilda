import {
  type Dependency,
  MAX_HEALTH_STEPS,
  type ServiceHealth,
  type ServiceHealthParams,
} from '@/features/services/schemas';
import type { Span } from '@/lib/trace-model';
import { percentile } from '@/lib/percentile';
import { volumeStep } from '@/lib/scales';
import { resolveBound } from '@/lib/time-range';
import { type Dataset, SEED_NOW } from '@/mocks/seed';

/** The range asked for, with relative bounds read on the server's clock. */
function rangeOf(dataset: Dataset, params: ServiceHealthParams) {
  const oldest = dataset.traces.at(-1);
  const bound = (text: string | undefined) =>
    text === undefined ? null : resolveBound(text, SEED_NOW);
  return {
    fromMs:
      bound(params.from) ?? (oldest ? Date.parse(oldest.startedAt) : SEED_NOW),
    toMs: bound(params.to) ?? SEED_NOW,
  };
}

/** The calls between this service and another, being counted. */
interface Tally {
  calls: number;
  failed: number;
}

function tally(into: Map<string, Tally>, service: string, failed: boolean) {
  const entry = into.get(service) ?? { calls: 0, failed: 0 };
  entry.calls += 1;
  if (failed) entry.failed += 1;
  into.set(service, entry);
}

/** Most calls first, then by name, so the order is the same on every load. */
function toDependencies(tallies: Map<string, Tally>): Dependency[] {
  return [...tallies]
    .map(([service, entry]) => ({ service, ...entry }))
    .sort((a, b) => b.calls - a.calls || a.service.localeCompare(b.service));
}

/**
 * What a real server would do for `GET /api/services/:name/health`: every
 * call to the service in the range, counted per step of time and in all,
 * with the median and the 95th percentile of their durations, and the
 * services on either side of it.
 *
 * A call is one span of the service, timed by its own start, not its
 * request's. The range and the step follow the same rules as the volume of
 * traces: relative bounds are read on the server's clock, an open end goes
 * to the oldest trace or to "now", and the step is the smallest round one
 * that keeps to `maxSteps`.
 */
export function queryServiceHealth(
  dataset: Dataset,
  service: string,
  params: ServiceHealthParams,
  maxSteps = MAX_HEALTH_STEPS,
): ServiceHealth {
  const { fromMs, toMs } = rangeOf(dataset, params);
  const iso = (ms: number) => new Date(ms).toISOString();

  const empty: ServiceHealth = {
    service,
    from: iso(fromMs),
    to: iso(toMs),
    stepMs: 60_000,
    calls: 0,
    failed: 0,
    medianMs: null,
    p95Ms: null,
    steps: [],
    callers: [],
    callees: [],
  };
  // A range the wrong way round has nothing in it.
  if (toMs <= fromMs) {
    return empty;
  }

  const stepMs = volumeStep(toMs - fromMs, maxSteps);
  const firstMs = Math.floor(fromMs / stepMs) * stepMs;
  const steps: { start: number; ok: number; error: number; ms: number[] }[] =
    [];
  for (let start = firstMs; start < toMs; start += stepMs) {
    steps.push({ start, ok: 0, error: 0, ms: [] });
  }

  const all: number[] = [];
  const callers = new Map<string, Tally>();
  const callees = new Map<string, Tally>();

  for (const trace of dataset.traces) {
    const spans = dataset.spansByTraceId.get(trace.id) ?? [];
    if (!spans.some((span) => span.service === service)) {
      continue;
    }
    const startedMs = Date.parse(trace.startedAt);
    const byId = new Map(spans.map((span) => [span.id, span]));
    const childrenOf = new Map<string, Span[]>();
    for (const span of spans) {
      if (span.parentId !== null) {
        childrenOf.set(span.parentId, [
          ...(childrenOf.get(span.parentId) ?? []),
          span,
        ]);
      }
    }

    for (const span of spans) {
      if (span.service !== service) {
        continue;
      }
      const atMs = startedMs + span.startMs;
      if (atMs < fromMs || atMs >= toMs) {
        continue;
      }
      const failed = span.status === 'error';
      const step = steps[Math.floor((atMs - firstMs) / stepMs)];
      if (step) {
        step[span.status] += 1;
        step.ms.push(span.durationMs);
      }
      all.push(span.durationMs);

      // A call from another service into this one, and this one's calls
      // out. Calls within the service (a step inside a step) are not
      // dependencies.
      const parent = span.parentId === null ? null : byId.get(span.parentId);
      if (parent && parent.service !== service) {
        tally(callers, parent.service, failed);
      }
      for (const child of childrenOf.get(span.id) ?? []) {
        if (child.service !== service) {
          tally(callees, child.service, child.status === 'error');
        }
      }
    }
  }

  const ascending = (values: number[]) => [...values].sort((a, b) => a - b);
  const sortedAll = ascending(all);

  return {
    ...empty,
    stepMs,
    calls: all.length,
    failed: steps.reduce((sum, step) => sum + step.error, 0),
    medianMs: percentile(sortedAll, 0.5),
    p95Ms: percentile(sortedAll, 0.95),
    steps: steps.map((step) => {
      const sorted = ascending(step.ms);
      return {
        start: iso(step.start),
        ok: step.ok,
        error: step.error,
        medianMs: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95),
      };
    }),
    callers: toDependencies(callers),
    callees: toDependencies(callees),
  };
}
