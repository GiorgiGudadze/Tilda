import type { Span } from '@/features/traces/schemas';

export interface SpanRow {
  span: Span;
  /** 0 for the root span, 1 for its children, and so on. */
  depth: number;
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

  function visit(parentId: string | null, depth: number) {
    const children = childrenByParent.get(parentId) ?? [];
    children.sort((a, b) => a.startMs - b.startMs);
    for (const span of children) {
      rows.push({ span, depth });
      visit(span.id, depth + 1);
    }
  }

  visit(null, 0);
  return rows;
}
