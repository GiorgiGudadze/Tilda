import { Crosshair, Hourglass } from 'lucide-react';
import { useId } from 'react';
import { ServiceLabel } from '@/components/ServiceLabel';
import { SpanBar } from '@/components/SpanBar';
import { StatusBadge } from '@/components/StatusBadge';
import { TimelineRuler } from '@/components/TimelineRuler';
import type { Span } from '@/features/traces/schemas';
import { selfTimes, slowestSpanId } from '@/features/traces/self-time';
import { serviceColor } from '@/features/traces/service-colors';
import { SpanDetails } from '@/features/traces/SpanDetails';
import { spanRowId } from '@/features/traces/span-row-id';
import { flattenSpans } from '@/features/traces/span-tree';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

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
 * The columns of a row on a wide screen: name, bar, markers, duration.
 * On a phone a row is two lines: the name with its markers, then the bar
 * with the duration. `PHONE_LINE` is the grid of that second line.
 */
const WIDE_COLUMNS =
  'sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_9rem_4.5rem] sm:gap-x-3';
const PHONE_LINE = 'grid grid-cols-[minmax(0,1fr)_4.5rem] gap-x-3';

/**
 * Every span as one row: its name, a bar on the trace's timeline and its
 * duration. A row is a button that opens the span's details under it.
 */
export function Waterfall({
  spans,
  totalMs,
  selectedSpanId,
  onSelectSpan,
  evidenceSpanIds = [],
}: WaterfallProps) {
  const detailsId = useId();
  const rows = flattenSpans(spans);
  const selfMsById = selfTimes(spans);
  const slowestId = slowestSpanId(spans, selfMsById);
  // A trace of 0 ms would divide by zero.
  const total = Math.max(totalMs, 1);

  // Five ticks: the start, the end and the three quarters between them.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) =>
    formatDuration(totalMs * share),
  );

  return (
    <div className="rounded-md border text-sm">
      <div className={cn(PHONE_LINE, WIDE_COLUMNS, 'px-3 pt-1.5')}>
        <TimelineRuler labels={ticks} className="sm:col-start-2" />
      </div>
      <ol aria-label="Spans" className="divide-y">
        {rows.map(({ span, depth }) => {
          const color = serviceColor(span.service);
          const selected = span.id === selectedSpanId;
          const failed = span.status === 'error';
          const isSlowest = span.id === slowestId;
          const isEvidence = evidenceSpanIds.includes(span.id);
          const duration = formatDuration(span.durationMs);

          return (
            <li key={span.id}>
              <button
                type="button"
                id={spanRowId(span.id)}
                aria-expanded={selected}
                aria-controls={selected ? detailsId : undefined}
                onClick={() => onSelectSpan(selected ? null : span.id)}
                className={cn(
                  'grid w-full cursor-pointer gap-y-1 px-3 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:items-center',
                  WIDE_COLUMNS,
                  // An open row is marked by its background and by a line
                  // down its left edge.
                  selected && 'bg-muted shadow-[inset_3px_0_0_var(--primary)]',
                )}
              >
                {/* The whole name in one piece, for screen readers. */}
                <span className="sr-only">
                  {`${span.service}, ${span.operation}, ${duration}, ${failed ? 'failed' : 'OK'}${isSlowest ? ', slowest span' : ''}${isEvidence ? ', evidence for the suggested cause' : ''}`}
                </span>

                <span
                  aria-hidden="true"
                  className="flex min-w-0 items-center gap-2 sm:contents"
                >
                  <span
                    className="min-w-0 flex-1 truncate sm:order-1"
                    style={{ paddingLeft: `${depth * 0.75}rem` }}
                  >
                    <ServiceLabel name={span.service} color={color} />{' '}
                    <span className="text-muted-foreground">
                      {span.operation}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 sm:order-3">
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
                  className={cn(PHONE_LINE, 'items-center sm:contents')}
                >
                  <SpanBar
                    start={span.startMs / total}
                    length={span.durationMs / total}
                    color={color}
                    className="sm:order-2"
                  />
                  <span className="text-right tabular-nums sm:order-4">
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
