import { describe, expect, it } from 'vitest';
import {
  MAX_VOLUME_BARS,
  PAGE_SIZE,
  traceListParamsSchema,
  type TraceListParams,
} from '@/features/traces/schemas';
import { toBound } from '@/lib/time-range';
import {
  listServices,
  queryTracePoints,
  queryTraces,
  queryTraceVolume,
} from '@/mocks/query-traces';
import { createDataset, SEED_NOW, SEEDED_TRACE_IDS } from '@/mocks/seed';

const dataset = createDataset();

/** Runs the query with the defaults for everything not given. */
function query(params: Partial<TraceListParams> = {}) {
  return queryTraces(dataset, traceListParamsSchema.parse(params));
}

function sum(numbers: number[]) {
  return numbers.reduce((total, value) => total + value, 0);
}

describe('queryTraces', () => {
  it('returns the first page, newest first, when nothing is asked', () => {
    const result = query();
    expect(result.total).toBe(dataset.traces.length);
    expect(result.items).toEqual(dataset.traces.slice(0, PAGE_SIZE));
  });

  it('filters by status', () => {
    const result = query({ status: 'error' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((trace) => trace.status === 'error')).toBe(true);
  });

  it('finds text in the operation, whatever the case', () => {
    const result = query({ q: 'CHECKOUT' });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every((trace) => trace.operation === 'POST /checkout'),
    ).toBe(true);
  });

  it('finds a trace by a part of its ID', () => {
    const result = query({ q: 'e5f60002' });
    expect(result.items.map((trace) => trace.id)).toEqual([
      SEEDED_TRACE_IDS.error,
    ]);
  });

  it('filters by a service that took part at any depth', () => {
    const result = query({ service: 'payments' });
    expect(result.total).toBeGreaterThan(0);
    // No trace starts at payments. They only pass through it.
    expect(result.items.every((trace) => trace.service !== 'payments')).toBe(
      true,
    );
    expect(
      result.items.every((trace) => trace.operation === 'POST /checkout'),
    ).toBe(true);
  });

  it('filters by a duration range, both ends included', () => {
    const matching = (min: number, max: number) =>
      dataset.traces.filter(
        (trace) => trace.durationMs >= min && trace.durationMs <= max,
      );
    // A range whose ends are durations that occur, so both ends are tested.
    const durations = [
      ...new Set(dataset.traces.map((trace) => trace.durationMs)),
    ].sort((a, b) => a - b);
    const min = durations[10]!;
    const max = durations[40]!;

    const result = query({ minMs: min, maxMs: max, sort: 'slowest' });

    expect(result.total).toBe(matching(min, max).length);
    expect(result.items[0]?.durationMs).toBe(max);
    expect(query({ minMs: min }).total).toBe(matching(min, Infinity).length);
    expect(query({ maxMs: max }).total).toBe(matching(0, max).length);
  });

  it('finds nothing when the max is below the min', () => {
    expect(query({ minMs: 500, maxMs: 200 }).total).toBe(0);
  });

  it('sorts by duration, slowest first', () => {
    const durations = query({ sort: 'slowest' }).items.map(
      (trace) => trace.durationMs,
    );
    expect(durations).toEqual([...durations].sort((a, b) => b - a));
    expect(durations[0]).toBe(
      Math.max(...dataset.traces.map((trace) => trace.durationMs)),
    );
  });

  it('sorts by duration, fastest first', () => {
    const durations = query({ sort: 'fastest' }).items.map(
      (trace) => trace.durationMs,
    );
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
    expect(durations[0]).toBe(
      Math.min(...dataset.traces.map((trace) => trace.durationMs)),
    );
  });

  it('sorts by start time, oldest first', () => {
    expect(query({ sort: 'oldest' }).items).toEqual(
      [...dataset.traces].reverse().slice(0, PAGE_SIZE),
    );
  });

  const lastPage = Math.ceil(dataset.traces.length / PAGE_SIZE);

  it('returns each page without gaps or repeats', () => {
    const pages = Array.from({ length: lastPage }, (_, index) => index + 1);
    const ids = pages.flatMap((page) =>
      query({ page }).items.map((trace) => trace.id),
    );
    expect(ids).toEqual(dataset.traces.map((trace) => trace.id));
  });

  it('answers a page beyond the last with the last page', () => {
    expect(query({ page: 999 })).toEqual(query({ page: lastPage }));
    expect(query({ page: lastPage }).items).toHaveLength(
      dataset.traces.length - (lastPage - 1) * PAGE_SIZE,
    );
  });

  it('returns no items and a total of 0 when nothing matches', () => {
    const result = query({ q: 'no such operation' });
    expect(result).toMatchObject({ items: [], total: 0 });
  });
});

describe('queryTraceVolume', () => {
  const volume = (params: Partial<TraceListParams> = {}) =>
    queryTraceVolume(dataset, traceListParamsSchema.parse(params));
  const MINUTE = 60_000;

  it('counts every matching trace once, split by status', () => {
    const { bars } = volume();
    expect(sum(bars.map((bar) => bar.ok + bar.error))).toBe(
      dataset.traces.length,
    );
    expect(sum(bars.map((bar) => bar.error))).toBe(
      query({ status: 'error' }).total,
    );
  });

  it('applies every filter, the duration too', () => {
    const { bars } = volume({ minMs: 1000, name: ['GET /orders'] });
    expect(sum(bars.map((bar) => bar.ok + bar.error))).toBe(
      query({ minMs: 1000, name: ['GET /orders'] }).total,
    );
  });

  it('spans the range asked for, in round steps', () => {
    const result = volume({ from: 'now-6h', to: 'now' });
    expect(result.stepMs).toBe(10 * MINUTE);
    expect(result.bars).toHaveLength(36);
    expect(result.bars[0]?.start).toBe('2026-11-14T06:00:00.000Z');
    expect(result.to).toBe(new Date(SEED_NOW).toISOString());
  });

  it('spans all the data when no range is asked, within the bar limit', () => {
    const result = volume();
    expect(result.stepMs).toBe(30 * MINUTE);
    expect(result.bars.length).toBeLessThanOrEqual(MAX_VOLUME_BARS);
  });

  it('counts a bar exactly as the list counts its time', () => {
    const { bars, stepMs } = volume({ from: 'now-1h', to: 'now' });
    for (const bar of bars) {
      const startMs = Date.parse(bar.start);
      const list = query({
        from: toBound(startMs),
        to: toBound(startMs + stepMs),
      });
      expect(list.total).toBe(bar.ok + bar.error);
    }
  });

  it('has no bars for a range the wrong way round', () => {
    expect(volume({ from: 'now', to: 'now-1h' }).bars).toEqual([]);
  });
});

describe('listServices', () => {
  it('lists every service once, in alphabetical order', () => {
    expect(listServices(dataset)).toEqual([
      'api-gateway',
      'auth',
      'catalog',
      'inventory',
      'orders',
      'payments',
      'postgres',
      'redis',
    ]);
  });
});

describe('queryTraces, the sidebar filters', () => {
  it('filters by an exact request name', () => {
    const result = query({ name: ['POST /login'] });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every((trace) => trace.operation === 'POST /login'),
    ).toBe(true);
    // Search would also find "POST /login" in a longer name. The name filter
    // matches the whole name only.
    expect(query({ name: ['POST'] }).total).toBe(0);
  });

  it('filters by several request names: a trace matches any of them', () => {
    const names = ['POST /login', 'GET /orders'];
    const result = query({ name: names, sort: 'slowest' });
    expect(result.total).toBe(
      dataset.traces.filter((trace) => names.includes(trace.operation)).length,
    );
    expect(new Set(result.items.map((trace) => trace.operation))).toEqual(
      new Set(names),
    );
  });

  it('reads one name, several, or none from the query string', () => {
    const parse = (name: unknown) => traceListParamsSchema.parse({ name }).name;
    expect(parse(undefined)).toEqual([]);
    expect(parse('GET /orders')).toEqual(['GET /orders']);
    expect(parse(['GET /orders', 'POST /login'])).toEqual([
      'GET /orders',
      'POST /login',
    ]);
    expect(parse('')).toEqual([]);
  });

  it('filters by a time range, counting back from the server clock', () => {
    const result = query({ from: 'now-1h', to: 'now' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(dataset.traces.length);
    expect(
      result.items.every(
        (trace) => Date.parse(trace.startedAt) >= SEED_NOW - 60 * 60_000,
      ),
    ).toBe(true);
  });

  it('filters by times in UTC, from the start up to the end', () => {
    const from = '2026-11-14 06:00';
    const to = '2026-11-14 08:00';
    const result = query({ from, to });
    const inside = dataset.traces.filter((trace) => {
      const ms = Date.parse(trace.startedAt);
      return ms >= Date.UTC(2026, 10, 14, 6) && ms < Date.UTC(2026, 10, 14, 8);
    });
    expect(result.total).toBe(inside.length);
    expect(result.total).toBeGreaterThan(0);
  });

  it('leaves a missing end open, and a range the wrong way round empty', () => {
    expect(query({ from: 'now-1h' }).total).toBe(
      query({ from: 'now-1h', to: 'now' }).total,
    );
    expect(query({ from: 'now', to: 'now-1h' }).total).toBe(0);
  });

  it('rejects a bound that is not a time', () => {
    expect(traceListParamsSchema.safeParse({ from: 'yesterday' }).success).toBe(
      false,
    );
  });

  it('counts each name without the name filter, so the others keep their counts', () => {
    const { facets } = query({ name: ['POST /login'], status: 'error' });
    const errors = query({ status: 'error' }).total;
    expect(sum(facets.names.map((item) => item.count))).toBe(errors);
    expect(facets.names.map((item) => item.name)).toEqual(
      [...facets.names.map((item) => item.name)].sort(),
    );
  });
});

describe('queryTracePoints', () => {
  const points = (params: Partial<TraceListParams> = {}, limit?: number) =>
    queryTracePoints(dataset, traceListParamsSchema.parse(params), limit);

  it('returns every trace as a dot, newest first, when nothing is asked', () => {
    const result = points();
    expect(result.total).toBe(dataset.traces.length);
    expect(result.points.map((point) => point.id)).toEqual(
      dataset.traces.map((trace) => trace.id),
    );
  });

  it('applies the same filters as the list, apart from duration', () => {
    const params = { q: 'checkout', status: 'error' as const };
    expect(points(params).total).toBe(query(params).total);
    expect(points(params).points.map((point) => point.id)).toEqual(
      query(params).items.map((trace) => trace.id),
    );
  });

  it('keeps only the newest past the limit, and says how many there were', () => {
    const result = points({}, 10);
    expect(result.points).toHaveLength(10);
    expect(result.points.map((point) => point.id)).toEqual(
      dataset.traces.slice(0, 10).map((trace) => trace.id),
    );
    expect(result.total).toBe(dataset.traces.length);
  });
});
