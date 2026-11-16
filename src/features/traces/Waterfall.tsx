import { ChevronRight, Crosshair, Hourglass } from 'lucide-react';
import { useId, useState } from 'react';
import { ServiceLabel } from '@/components/ServiceLabel';
import { SpanBar } from '@/components/SpanBar';
import { StatusBadge } from '@/components/StatusBadge';
import { TimelineRuler } from '@/components/TimelineRuler';
import type { Span } from '@/lib/trace-model';
import { selfTimes, slowestSpanId } from '@/features/traces/self-time';
import { SpanDetails } from '@/features/traces/SpanDetails';
import { spanRowId } from '@/features/traces/span-row-id';
import { flattenSpans, visibleRows } from '@/features/traces/span-tree';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { serviceColor } from '@/lib/known-services';

interface WaterfallProps {
  spans: Span[];
  /** Duration of the whole trace. Every bar is drawn against it. */
  totalMs: number;
  selectedSpanId: string | null;
  /** Called with a span's ID, or `null` when the open row is closed. */
  onSelectSpan: (id: string | null) => void;
  /** The spans a suggested cause is based on. Their rows are marked. */
  evidenceSpanIds?: string[];
}

/**
 * The columns of a row when the waterfall is wide: name, bar, markers,
 * duration. When it is narrow a row is two lines: the name with its
 * markers, then the bar with the duration. `NARROW_LINE` is the grid of
 * that second line.
 *
 * "Wide" is about the waterfall itself (`@4xl` is a container query: 56rem
 * or more), not the screen. Beside the suggestion panel it has less room
 * than the screen suggests.
 */
const WIDE_COLUMNS =
  '@4xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_9rem_4.5rem] @4xl:gap-x-3';
const NARROW_LINE = 'grid grid-cols-[minmax(0,1fr)_4.5rem] gap-x-3';

/** The width the caret takes before every name, so names line up. */
const CARET_REM = 1.5;
/** How far each level of the tree is indented. */
const INDENT_REM = 0.75;

/**
 * Every span as one row: its name, a bar on the trace's timeline and its
 * duration. A row is a button that opens the span's details under it.
 *
 * A span with children has a caret before its name that folds them away.
 * The caret is a button of its own beside the row's button, not inside it:
 * a button inside a button is not allowed, and one click would do two things.
 */
export function Waterfall({
  spans,
  totalMs,
  selectedSpanId,
  onSelectSpan,
  evidenceSpanIds = [],
}: WaterfallProps) {
  const detailsId = useId();
  const allRows = flattenSpans(spans);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  // A link can open a span that is folded away, as the evidence of a
  // suggestion does. Its branch opens, so the row can be seen and focused.
  const selectedRow = allRows.find((row) => row.span.id === selectedSpanId);
  if (selectedRow?.ancestorIds.some((id) => collapsed.has(id))) {
    setCollapsed(
      new Set(
        [...collapsed].filter((id) => !selectedRow.ancestorIds.includes(id)),
      ),
    );
  }

  function toggle(spanId: string) {
    const next = new Set(collapsed);
    if (next.has(spanId)) {
      next.delete(spanId);
    } else {
      next.add(spanId);
      // Folding away the open span closes its details.
      if (selectedRow?.ancestorIds.includes(spanId)) {
        onSelectSpan(null);
      }
    }
    setCollapsed(next);
  }

  const rows = visibleRows(allRows, collapsed);
  const selfMsById = selfTimes(spans);
  const slowestId = slowestSpanId(spans, selfMsById);
  // A trace of 0 ms would divide by zero.
  const total = Math.max(totalMs, 1);

  // Five ticks: the start, the end and the three quarters between them.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) =>
    formatDuration(totalMs * share),
  );

  return (
    <div className="@container rounded-md border text-sm">
      <div className={cn(NARROW_LINE, WIDE_COLUMNS, 'px-3 pt-1.5')}>
        <TimelineRuler labels={ticks} className="@4xl:col-start-2" />
      </div>
      <ol aria-label="Spans" className="divide-y">
        {rows.map(({ span, depth, descendantCount }) => {
          const color = serviceColor(span.service);
          const selected = span.id === selectedSpanId;
          const failed = span.status === 'error';
          const isSlowest = span.id === slowestId;
          const isEvidence = evidenceSpanIds.includes(span.id);
          const duration = formatDuration(span.durationMs);
          const folded = collapsed.has(span.id);
          const name = `${span.service} ${span.operation}`;

          return (
            <li key={span.id} className="relative">
              {descendantCount > 0 && (
                <button
                  type="button"
                  aria-expanded={!folded}
                  aria-label={
                    folded
                      ? `Expand ${name}, ${descendantCount} ${descendantCount === 1 ? 'span' : 'spans'} inside`
                      : `Collapse ${name}`
                  }
                  title={folded ? 'Expand' : 'Collapse'}
                  onClick={() => toggle(span.id)}
                  // On the first line of the row, at the start of the name.
                  className="absolute top-1 z-10 flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  style={{ left: `calc(0.5rem + ${depth * INDENT_REM}rem)` }}
                >
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      'size-4 transition-transform motion-reduce:transition-none',
                      !folded && 'rotate-90',
                    )}
                  />
                </button>
              )}
              <button
                type="button"
                id={spanRowId(span.id)}
                aria-expanded={selected}
                aria-controls={selected ? detailsId : undefined}
                onClick={() => onSelectSpan(selected ? null : span.id)}
                className={cn(
                  'grid w-full cursor-pointer gap-y-1 px-3 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset @4xl:items-center',
                  WIDE_COLUMNS,
                  // An open row is marked by its background and by a line
                  // down its left edge.
                  selected && 'bg-muted shadow-[inset_3px_0_0_var(--primary)]',
                )}
              >
                {/* The whole name in one piece, for screen readers. */}
                <span className="sr-only">
                  {`${span.service}, ${span.operation}, ${duration}, ${failed ? 'failed' : 'OK'}${isSlowest ? ', slowest span' : ''}${isEvidence ? ', evidence for the suggested cause' : ''}${folded ? `, ${descendantCount} ${descendantCount === 1 ? 'span' : 'spans'} folded away` : ''}`}
                </span>

                <span
                  aria-hidden="true"
                  className="flex min-w-0 items-center gap-2 @4xl:contents"
                >
                  <span
                    className="min-w-0 flex-1 truncate @4xl:order-1"
                    style={{
                      paddingLeft: `${depth * INDENT_REM + CARET_REM}rem`,
                    }}
                  >
                    <ServiceLabel name={span.service} color={color} />{' '}
                    <span className="text-muted-foreground">
                      {span.operation}
                    </span>
                    {folded && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {`${descendantCount} hidden`}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 @4xl:order-3">
                    {isEvidence && (
                      <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                        <Crosshair className="size-3.5 shrink-0" />
                        Evidence
                      </span>
                    )}
                    {isSlowest && (
                      <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                        <Hourglass className="size-3.5 shrink-0" />
                        Slowest
                      </span>
                    )}
                    {failed && <StatusBadge status="error" label="Failed" />}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={cn(NARROW_LINE, 'items-center @4xl:contents')}
                >
                  <SpanBar
                    start={span.startMs / total}
                    length={span.durationMs / total}
                    color={color}
                    className="@4xl:order-2"
                  />
                  <span className="text-right tabular-nums @4xl:order-4">
                    {duration}
                  </span>
                </span>
              </button>

              {selected && (
                <SpanDetails
                  id={detailsId}
                  span={span}
                  selfMs={selfMsById.get(span.id) ?? 0}
                  totalMs={totalMs}
                  parent={spans.find((item) => item.id === span.parentId)}
                  childCount={
                    spans.filter((item) => item.parentId === span.id).length
                  }
                  isSlowest={isSlowest}
                  onSelectSpan={onSelectSpan}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
