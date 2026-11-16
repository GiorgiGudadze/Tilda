import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router';
import { DurationBar } from '@/components/DurationBar';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { TraceId } from '@/components/TraceId';
import type { TraceSummary } from '@/lib/trace-model';
import type { Sort } from '@/features/traces/schemas';
import { directionOf, nextSort, type SortColumn } from '@/features/traces/sort';
import { formatDateTime, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TraceResultsProps {
  traces: TraceSummary[];
  /** IDs of the traces whose suggested cause the user has decided on. */
  reviewedIds: Set<string>;
}

/**
 * Marks a trace whose suggested cause was accepted, edited or rejected,
 * with an icon and a word.
 */
function ReviewedMarker() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground">
      <ClipboardCheck aria-hidden="true" className="size-3.5 shrink-0" />
      Reviewed
    </span>
  );
}

const linkClass = 'font-medium underline underline-offset-4';

/**
 * The request link, stretched over its whole row or card by an empty
 * `::after` box, so a click anywhere on the row opens the trace and shows
 * the pointer. It is still one link: Cmd-click, a middle click and "Open in
 * new tab" work, and the keyboard and screen readers meet it once.
 * The cost: text in the row cannot be selected by dragging.
 */
const stretchedLinkClass = `${linkClass} after:absolute after:inset-0`;

/** The longest duration on the page fills its bar. The rest compare to it. */
function longest(traces: TraceSummary[]): number {
  return Math.max(...traces.map((trace) => trace.durationMs), 0);
}

interface SortHeaderProps {
  label: string;
  column: SortColumn;
  sort: Sort;
  onSort: (sort: Sort) => void;
  /** Numbers sit on the right, so the header does too, icon first. */
  alignEnd?: boolean;
  className?: string;
}

/**
 * The header of a column that can be sorted: a button with an arrow. Down
 * is the largest or newest first, up the other way round, and the double
 * arrow says the column can be sorted but is not.
 *
 * `aria-sort` on the header tells a screen reader which way the column is
 * sorted. The button only needs its name.
 */
function SortHeader({
  label,
  column,
  sort,
  onSort,
  alignEnd = false,
  className,
}: SortHeaderProps) {
  const direction = directionOf(sort, column);
  const Icon =
    direction === 'descending'
      ? ArrowDown
      : direction === 'ascending'
        ? ArrowUp
        : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={direction ?? undefined}
      className={cn('py-1 font-medium', alignEnd && 'text-right', className)}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, column))}
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          alignEnd && 'flex-row-reverse',
          direction && 'text-foreground',
        )}
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
    </th>
  );
}

interface TraceTableProps extends TraceResultsProps {
  sort: Sort;
  onSort: (sort: Sort) => void;
}

/** The results as a table, for screens wide enough for one. */
export function TraceTable({
  traces,
  reviewedIds,
  sort,
  onSort,
}: TraceTableProps) {
  const max = longest(traces);
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Traces</caption>
      <thead className="border-b text-muted-foreground">
        <tr>
          <th scope="col" className="py-1.5 pr-4 font-medium">
            Trace ID
          </th>
          <th scope="col" className="py-1.5 pr-4 font-medium">
            Request
          </th>
          <th scope="col" className="py-1.5 pr-4 font-medium">
            Status
          </th>
          <SortHeader
            label="Duration"
            column="duration"
            sort={sort}
            onSort={onSort}
            alignEnd
            className="pr-4"
          />
          <th scope="col" className="py-1.5 pr-4 text-right font-medium">
            Spans
          </th>
          <SortHeader
            label="Started"
            column="started"
            sort={sort}
            onSort={onSort}
          />
        </tr>
      </thead>
      <tbody className="divide-y">
        {traces.map((trace) => (
          // `relative` holds the stretched link inside this row.
          <tr key={trace.id} className="relative hover:bg-muted">
            <td className="py-1.5 pr-4">
              <TraceId id={trace.id} />
            </td>
            <td className="py-1.5 pr-4">
              <Link to={`/traces/${trace.id}`} className={stretchedLinkClass}>
                {trace.operation}
              </Link>{' '}
              <span className="text-muted-foreground">{trace.service}</span>
              {reviewedIds.has(trace.id) && (
                <>
                  {' '}
                  <ReviewedMarker />
                </>
              )}
            </td>
            <td className="py-1.5 pr-4">
              <StatusBadge status={trace.status} />
            </td>
            <td className="py-1.5 pr-4">
              <div className="flex items-center justify-end gap-2">
                {/* Hidden on the narrowest tables, where the trace ID column
                    leaves no room. The number beside it says the same. */}
                <DurationBar
                  value={trace.durationMs}
                  max={max}
                  className="hidden w-20 md:block"
                />
                <span className="w-16 text-right tabular-nums">
                  {formatDuration(trace.durationMs)}
                </span>
              </div>
            </td>
            <td className="py-1.5 pr-4 text-right tabular-nums">
              {trace.spanCount}
            </td>
            <td className="py-1.5 whitespace-nowrap tabular-nums">
              {formatDateTime(trace.startedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The same results as a list of cards, for phones. Two lines each, so a
 * screen holds about twice as many: what and how it ended, then how long,
 * where and when. The trace ID, the span count and the duration bar are on
 * the trace's own page.
 */
export function TraceCards({ traces, reviewedIds }: TraceResultsProps) {
  return (
    <ul className="space-y-2 text-sm">
      {traces.map((trace) => (
        <li
          key={trace.id}
          className="relative space-y-1 rounded-lg border px-3 py-2.5 hover:bg-muted"
        >
          <div className="flex items-start gap-3">
            <Link
              to={`/traces/${trace.id}`}
              className={cn(stretchedLinkClass, 'mr-auto')}
            >
              {trace.operation}
            </Link>
            {reviewedIds.has(trace.id) && <ReviewedMarker />}
            <StatusBadge status={trace.status} />
          </div>
          <p className="text-muted-foreground">
            <span className="text-foreground tabular-nums">
              {formatDuration(trace.durationMs)}
            </span>
            , {trace.service}, {formatDateTime(trace.startedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Stands in for the results on the first load. */
export function TraceResultsSkeleton() {
  return (
    <div className="space-y-2">
      <p className="sr-only">Loading traces…</p>
      {Array.from({ length: 10 }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}
