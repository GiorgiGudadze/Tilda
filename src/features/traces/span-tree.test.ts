import { describe, expect, it } from 'vitest';
import type { Span } from '@/lib/trace-model';
import { flattenSpans, visibleRows } from '@/features/traces/span-tree';

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

describe('the tree of each row', () => {
  const spans = [
    span('root', null, 0),
    span('a', 'root', 5),
    span('a1', 'a', 6),
    span('a2', 'a', 7),
    span('a2x', 'a2', 8),
    span('b', 'root', 20),
  ];
  const rows = flattenSpans(spans);
  const byId = (id: string) => rows.find((row) => row.span.id === id)!;

  it('knows the spans above a row, nearest first', () => {
    expect(byId('root').ancestorIds).toEqual([]);
    expect(byId('a2x').ancestorIds).toEqual(['a2', 'a', 'root']);
  });

  it('counts the spans below a row, at any depth', () => {
    expect(byId('root').descendantCount).toBe(5);
    expect(byId('a').descendantCount).toBe(3);
    expect(byId('a2').descendantCount).toBe(1);
    expect(byId('b').descendantCount).toBe(0);
  });
});

describe('visibleRows', () => {
  const rows = flattenSpans([
    span('root', null, 0),
    span('a', 'root', 5),
    span('a1', 'a', 6),
    span('a1x', 'a1', 7),
    span('b', 'root', 20),
  ]);
  const ids = (collapsed: string[]) =>
    visibleRows(rows, new Set(collapsed)).map((row) => row.span.id);

  it('shows every row when nothing is folded', () => {
    expect(ids([])).toEqual(['root', 'a', 'a1', 'a1x', 'b']);
  });

  it('hides everything below a folded span, but not the span itself', () => {
    expect(ids(['a'])).toEqual(['root', 'a', 'b']);
    expect(ids(['root'])).toEqual(['root']);
  });

  it('keeps a folded span hidden when a span above it is folded too', () => {
    expect(ids(['a1', 'root'])).toEqual(['root']);
    expect(ids(['a1'])).toEqual(['root', 'a', 'a1', 'b']);
  });
});
