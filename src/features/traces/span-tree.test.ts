import { describe, expect, it } from 'vitest';
import type { Span } from '@/features/traces/schemas';
import { flattenSpans } from '@/features/traces/span-tree';

function span(id: string, parentId: string | null, startMs: number): Span {
  return {
    id,
    parentId,
    service: 'orders',
    operation: id,
    startMs,
    durationMs: 10,
    status: 'ok',
  };
}

function summary(spans: Span[]) {
  return flattenSpans(spans).map((row) => `${row.depth} ${row.span.id}`);
}

describe('flattenSpans', () => {
  it('returns no rows for no spans', () => {
    expect(flattenSpans([])).toEqual([]);
  });

  it('puts each parent before its children, with the depth of each span', () => {
    const spans = [
      span('root', null, 0),
      span('a', 'root', 5),
      span('a1', 'a', 6),
      span('b', 'root', 40),
    ];
    expect(summary(spans)).toEqual(['0 root', '1 a', '2 a1', '1 b']);
  });

  it('orders siblings by start time, whatever order they arrive in', () => {
    const spans = [
      span('late', 'root', 60),
      span('early-child', 'early', 12),
      span('root', null, 0),
      span('early', 'root', 10),
    ];
    expect(summary(spans)).toEqual([
      '0 root',
      '1 early',
      '2 early-child',
      '1 late',
    ]);
  });

  it('treats a span with a missing parent as a root', () => {
    const spans = [span('root', null, 0), span('orphan', 'gone', 20)];
    expect(summary(spans)).toEqual(['0 root', '0 orphan']);
  });
});
