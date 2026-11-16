import { describe, expect, it } from 'vitest';
import { MAX_HEALTH_STEPS } from '@/features/services/schemas';
import type { Span, TraceSummary } from '@/lib/trace-model';
import { toBound } from '@/lib/time-range';
import { queryServiceHealth } from '@/mocks/query-services';
import { createDataset, type Dataset, SEED_NOW } from '@/mocks/seed';

const dataset = createDataset();
const MINUTE = 60_000;

/** The spans of `service` in the dataset, with the time each started. */
function callsOf(service: string) {
  const calls: { atMs: number; span: Span }[] = [];
  for (const trace of dataset.traces) {
    const startedMs = Date.parse(trace.startedAt);
    for (const span of dataset.spansByTraceId.get(trace.id) ?? []) {
      if (span.service === service) {
        calls.push({ atMs: startedMs + span.startMs, span });
      }
    }
  }
  return calls;
}

/**
 * A small dataset drawn by hand: a gateway that calls postgres twice in one
 * request (one call fails), and orders that calls postgres once in another.
 */
function smallDataset(): Dataset {
  const trace = (id: string, minutesAgo: number, spans: Span[]) => {
    const summary: TraceSummary = {
      id,
      service: spans[0]!.service,
      operation: spans[0]!.operation,
      startedAt: new Date(SEED_NOW - minutesAgo * MINUTE).toISOString(),
      durationMs: spans[0]!.durationMs,
      status: spans[0]!.status,
      spanCount: spans.length,
    };
    return [summary, spans] as const;
  };
  const span = (
    id: string,
    parentId: string | null,
    service: string,
    startMs: number,
    durationMs: number,
    status: 'ok' | 'error' = 'ok',
  ): Span => ({
    id,
    parentId,
    service,
    operation: `${service} op`,
    startMs,
    durationMs,
    status,
  });
  const a = trace('a', 10, [
    span('s1', null, 'api-gateway', 0, 100),
    span('s2', 's1', 'postgres', 10, 20),
    span('s3', 's1', 'postgres', 40, 50, 'error'),
  ]);
  const b = trace('b', 5, [
    span('s1', null, 'orders', 0, 300),
    span('s2', 's1', 'postgres', 100, 200),
    span('s3', 's2', 'redis', 150, 5),
  ]);
  return {
    traces: [b[0], a[0]],
    spansByTraceId: new Map([
      ['a', [...a[1]]],
      ['b', [...b[1]]],
    ]),
  };
}

describe('queryServiceHealth', () => {
  it('counts every call to the service, a request with three queries three times', () => {
    const calls = callsOf('postgres');
    const health = queryServiceHealth(dataset, 'postgres', {});

    expect(health.calls).toBe(calls.length);
    expect(health.failed).toBe(
      calls.filter(({ span }) => span.status === 'error').length,
    );
    expect(health.steps.length).toBeLessThanOrEqual(MAX_HEALTH_STEPS);
    expect(
      health.steps.reduce((sum, step) => sum + step.ok + step.error, 0),
    ).toBe(calls.length);
  });

  it("keeps to the range, by the call's own start", () => {
    const fromMs = SEED_NOW - 6 * 60 * MINUTE;
    const health = queryServiceHealth(dataset, 'postgres', {
      from: toBound(fromMs),
      to: 'now',
    });

    const inRange = callsOf('postgres').filter(
      ({ atMs }) => atMs >= fromMs && atMs < SEED_NOW,
    );
    expect(health.calls).toBe(inRange.length);
    expect(Date.parse(health.from)).toBe(fromMs);
    expect(Date.parse(health.to)).toBe(SEED_NOW);
  });

  it('gives the median, the 95th percentile and the dependencies', () => {
    const health = queryServiceHealth(smallDataset(), 'postgres', {});

    expect(health.calls).toBe(3);
    expect(health.failed).toBe(1);
    // Durations 20, 50 and 200: the median is the second, p95 the third.
    expect(health.medianMs).toBe(50);
    expect(health.p95Ms).toBe(200);
    // Most calls first. The failed call counts against its caller.
    expect(health.callers).toEqual([
      { service: 'api-gateway', calls: 2, failed: 1 },
      { service: 'orders', calls: 1, failed: 0 },
    ]);
    expect(health.callees).toEqual([{ service: 'redis', calls: 1, failed: 0 }]);
  });

  it('puts each call in the step it started in', () => {
    const health = queryServiceHealth(smallDataset(), 'postgres', {
      from: toBound(SEED_NOW - 12 * MINUTE),
      to: 'now',
    });

    expect(health.stepMs).toBe(MINUTE);
    const busy = health.steps.filter((step) => step.ok + step.error > 0);
    expect(busy).toHaveLength(2);
    expect(busy[0]).toMatchObject({ ok: 1, error: 1, medianMs: 20, p95Ms: 50 });
    expect(busy[1]).toMatchObject({ ok: 1, error: 0, medianMs: 200 });
    // An empty step has nothing to measure.
    expect(health.steps[0]).toMatchObject({
      ok: 0,
      medianMs: null,
      p95Ms: null,
    });
  });

  it('has nothing for a service that is never called, or a range the wrong way round', () => {
    const none = queryServiceHealth(dataset, 'mainframe', {});
    expect(none).toMatchObject({ calls: 0, medianMs: null, callers: [] });
    expect(none.steps.length).toBeGreaterThan(0);

    const reversed = queryServiceHealth(dataset, 'postgres', {
      from: 'now',
      to: 'now-1h',
    });
    expect(reversed.steps).toEqual([]);
    expect(reversed.calls).toBe(0);
  });
});
