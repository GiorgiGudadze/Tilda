import { describe, expect, it } from 'vitest';
import { bucketOf } from '@/features/traces/duration-buckets';
import {
  PAGE_SIZE,
  traceListParamsSchema,
  type TraceListParams,
} from '@/features/traces/schemas';
import { listServices, queryTraces } from '@/mocks/query-traces';
import { createDataset, SEEDED_TRACE_IDS } from '@/mocks/seed';

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

  it('filters by duration range', () => {
    const result = query({ duration: '2-3s' });
    expect(result.total).toBeGreaterThan(0);
    expect(
      result.items.every((trace) => bucketOf(trace.durationMs) === '2-3s'),
    ).toBe(true);
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

  it('returns each page without gaps or repeats', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7].flatMap((page) =>
      query({ page }).items.map((trace) => trace.id),
    );
    expect(ids).toEqual(dataset.traces.map((trace) => trace.id));
  });

  it('answers a page beyond the last with the last page', () => {
    expect(query({ page: 99 })).toEqual(query({ page: 7 }));
    expect(query({ page: 7 }).items).toHaveLength(
      dataset.traces.length - 6 * PAGE_SIZE,
    );
  });

  it('returns no items and a total of 0 when nothing matches', () => {
    const result = query({ q: 'no such operation' });
    expect(result).toMatchObject({ items: [], total: 0 });
    expect(sum(result.buckets.map((bucket) => bucket.count))).toBe(0);
  });

  describe('chart counts', () => {
    it('add up to the number of matching traces', () => {
      expect(sum(query().buckets.map((bucket) => bucket.count))).toBe(
        dataset.traces.length,
      );
      const failed = query({ status: 'error' });
      expect(sum(failed.buckets.map((bucket) => bucket.count))).toBe(
        failed.total,
      );
    });

    it('ignore the selected duration range', () => {
      const all = query({ status: 'ok' });
      const oneRange = query({ status: 'ok', duration: '2-3s' });
      expect(oneRange.buckets).toEqual(all.buckets);
      expect(oneRange.total).toBe(
        all.buckets.find((bucket) => bucket.key === '2-3s')?.count,
      );
    });
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
