import type { Span } from '@/lib/trace-model';

interface SpanRow {
  span: Span;
  /** 0 for the root span, 1 for its children, and so on. */
  depth: number;
  /** The IDs of the spans above it, nearest first. */
  ancestorIds: string[];
  /** How many spans are below it, at any depth. */
  descendantCount: number;
}

/**
 * Orders spans for the waterfall: each parent is followed by its children,
 * earliest first. A span whose parent is missing is treated as a root, so
 * incomplete data still renders.
 */
export function flattenSpans(spans: Span[]): SpanRow[] {
  const ids = new Set(spans.map((span) => span.id));
  const childrenByParent = new Map<string | null, Span[]>();

  for (const span of spans) {
    const parentId =
      span.parentId !== null && ids.has(span.parentId) ? span.parentId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(span);
    childrenByParent.set(parentId, siblings);
  }

  const rows: SpanRow[] = [];

  /** Adds the rows below `parentId` and returns how many there were. */
  function visit(parentId: string | null, ancestorIds: string[]): number {
    const children = childrenByParent.get(parentId) ?? [];
    children.sort((a, b) => a.startMs - b.startMs);
    let added = 0;
    for (const span of children) {
      const row = {
        span,
        depth: ancestorIds.length,
        ancestorIds,
        descendantCount: 0,
      };
      rows.push(row);
      row.descendantCount = visit(span.id, [span.id, ...ancestorIds]);
      added += 1 + row.descendantCount;
    }
    return added;
  }

  visit(null, []);
  return rows;
}

/**
 * The rows that show when the spans in `collapsedIds` are folded: a row is
 * hidden when any span above it is folded. A folded span itself shows.
 */
export function visibleRows(
  rows: SpanRow[],
  collapsedIds: ReadonlySet<string>,
): SpanRow[] {
  return rows.filter(
    (row) => !row.ancestorIds.some((id) => collapsedIds.has(id)),
  );
}
