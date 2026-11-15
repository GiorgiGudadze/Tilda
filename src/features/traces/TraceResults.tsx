import { Pin } from 'lucide-react';
import { Link } from 'react-router';
import { DurationBar } from '@/components/DurationBar';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import type { TraceSummary } from '@/features/traces/schemas';
import { formatDateTime, formatDuration } from '@/lib/format';

interface TraceResultsProps {
  traces: TraceSummary[];
  /** IDs of the traces the user has pinned. */
  pinnedIds: Set<string>;
}

/** Marks a pinned trace with an icon and a word. */
function PinnedMarker() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground">
      <Pin aria-hidden="true" className="size-3.5 shrink-0" />
      Pinned
    </span>
  );
}

const linkClass = 'font-medium underline underline-offset-4';

/** The longest duration on the page fills its bar. The rest compare to it. */
function longest(traces: TraceSummary[]): number {
  return Math.max(...traces.map((trace) => trace.durationMs), 0);
}

/** The results as a table, for screens wide enough for one. */
export function TraceTable({ traces, pinnedIds }: TraceResultsProps) {
  const max = longest(traces);
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Traces</caption>
      <thead className="border-b text-muted-foreground">
        <tr>
          <th scope="col" className="py-1.5 pr-4 font-medium">
            Request
          </th>
          <th scope="col" className="py-1.5 pr-4 font-medium">
            Status
          </th>
          <th scope="col" className="py-1.5 pr-4 text-right font-medium">
            Duration
          </th>
          <th scope="col" className="py-1.5 pr-4 text-right font-medium">
            Spans
          </th>
          <th scope="col" className="py-1.5 font-medium">
            Started
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {traces.map((trace) => (
          <tr key={trace.id} className="hover:bg-muted">
            <td className="py-1.5 pr-4">
              <Link to={`/traces/${trace.id}`} className={linkClass}>
                {trace.operation}
              </Link>{' '}
              <span className="text-muted-foreground">{trace.service}</span>
              {pinnedIds.has(trace.id) && (
                <>
                  {' '}
                  <PinnedMarker />
                </>
              )}
            </td>
            <td className="py-1.5 pr-4">
              <StatusBadge status={trace.status} />
            </td>
            <td className="py-1.5 pr-4">
              <div className="flex items-center justify-end gap-2">
                <DurationBar
                  value={trace.durationMs}
                  max={max}
                  className="w-20"
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

/** The same results as a list of cards, for phones. */
export function TraceCards({ traces, pinnedIds }: TraceResultsProps) {
  const max = longest(traces);
  return (
    <ul className="space-y-2 text-sm">
      {traces.map((trace) => (
        <li key={trace.id} className="space-y-1.5 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/traces/${trace.id}`} className={linkClass}>
              {trace.operation}
            </Link>
            <StatusBadge status={trace.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              {formatDuration(trace.durationMs)}
            </span>
            <DurationBar
              value={trace.durationMs}
              max={max}
              className="flex-1"
            />
          </div>
          <p className="text-muted-foreground">
            {trace.service}, {trace.spanCount} spans,{' '}
            {formatDateTime(trace.startedAt)}
          </p>
          {pinnedIds.has(trace.id) && <PinnedMarker />}
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
