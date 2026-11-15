import { describe, expect, it } from 'vitest';
import type { Span } from '@/features/traces/schemas';
import { selfTimes, slowestSpanId } from '@/features/traces/self-time';
import { createDataset, SEEDED_TRACE_IDS } from '@/mocks/seed';

/** A span from `from` to `to`, as offsets from the start of the trace. */
function span(
  id: string,
  parentId: string | null,
  from: number,
  to: number,
): Span {
  return {
    id,
    parentId,
    service: 'orders',
    operation: id,
    startMs: from,
    durationMs: to - from,
    status: 'ok',
  };
}

function selfTime(spans: Span[], id: string) {
  return selfTimes(spans).get(id);
}

describe('selfTimes', () => {
  it('is the whole duration for a span without children', () => {
    expect(selfTime([span('root', null, 0, 100)], 'root')).toBe(100);
  });

  it('subtracts children that run one after another', () => {
    const spans = [
      span('root', null, 0, 100),
      span('a', 'root', 10, 30),
      span('b', 'root', 40, 90),
    ];
    expect(selfTime(spans, 'root')).toBe(100 - 20 - 50);
    expect(selfTime(spans, 'a')).toBe(20);
  });

  it('counts overlapping children once, as a union', () => {
    const spans = [
      span('root', null, 0, 100),
      span('a', 'root', 10, 60),
      span('b', 'root', 40, 80),
    ];
    // Together a and b cover 10 to 80.
    expect(selfTime(spans, 'root')).toBe(30);
  });

  it('counts a child inside another child once', () => {
    const spans = [
      span('root', null, 0, 100),
      span('long', 'root', 10, 90),
      span('short', 'root', 20, 30),
    ];
    expect(selfTime(spans, 'root')).toBe(20);
  });

  it('counts children that start together once', () => {
    const spans = [
      span('root', null, 0, 100),
      span('a', 'root', 10, 50),
      span('b', 'root', 10, 70),
    ];
    expect(selfTime(spans, 'root')).toBe(40);
  });

  it('clips a child that runs past its parent', () => {
    const spans = [span('root', null, 0, 100), span('late', 'root', 80, 150)];
    expect(selfTime(spans, 'root')).toBe(80);
  });

  it('ignores a child that is completely outside its parent', () => {
    const spans = [span('root', null, 0, 100), span('after', 'root', 120, 150)];
    expect(selfTime(spans, 'root')).toBe(100);
  });

  it('only subtracts direct children, not grandchildren', () => {
    const spans = [
      span('root', null, 0, 100),
      span('child', 'root', 10, 90),
      span('grandchild', 'child', 20, 80),
    ];
    expect(selfTime(spans, 'root')).toBe(20);
    expect(selfTime(spans, 'child')).toBe(20);
    expect(selfTime(spans, 'grandchild')).toBe(60);
  });

  it('adds up to the trace duration when no children overlap', () => {
    const dataset = createDataset();
    const spans = dataset.spansByTraceId.get(SEEDED_TRACE_IDS.slowQuery) ?? [];
    const total = [...selfTimes(spans).values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(2900);
  });
});

describe('slowestSpanId', () => {
  it('returns null when there are no spans', () => {
    expect(slowestSpanId([])).toBeNull();
  });

  it('picks the largest self time, not the longest span', () => {
    const spans = [
      span('root', null, 0, 100),
      span('wrapper', 'root', 5, 95),
      span('query', 'wrapper', 10, 90),
    ];
    // root and wrapper are longer, but they mostly wait for the query.
    expect(slowestSpanId(spans)).toBe('query');
  });

  it('picks the span that started earlier when self times are equal', () => {
    const spans = [
      span('root', null, 0, 100),
      span('second', 'root', 55, 95),
      span('first', 'root', 10, 50),
    ];
    expect(slowestSpanId(spans)).toBe('first');
  });

  it('finds the slow step in each hand-written trace', () => {
    const dataset = createDataset();
    const operationOfSlowest = (traceId: string) => {
      const spans = dataset.spansByTraceId.get(traceId) ?? [];
      const id = slowestSpanId(spans);
      return spans.find((item) => item.id === id)?.operation;
    };
    expect(operationOfSlowest(SEEDED_TRACE_IDS.slowQuery)).toBe(
      'SELECT orders WHERE user_id = ?',
    );
    expect(operationOfSlowest(SEEDED_TRACE_IDS.error)).toBe(
      'POST card-acquirer /authorize',
    );
    expect(operationOfSlowest(SEEDED_TRACE_IDS.uncertain)).toBe(
      'SELECT products WHERE name ILIKE ?',
    );
  });
});
