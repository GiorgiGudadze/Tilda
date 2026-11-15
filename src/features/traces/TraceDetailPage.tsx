import { parseAsString, useQueryState } from 'nuqs';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { useTrace } from '@/features/traces/hooks';
import { Waterfall } from '@/features/traces/Waterfall';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatDuration } from '@/lib/format';

export function TraceDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, error, refetch } = useTrace(id);
  // The open span is in the URL, so a link can point at one step.
  const [spanParam, setSpanParam] = useQueryState('span', parseAsString);

  const backLink = (
    <Link to="/traces" className="text-sm underline underline-offset-4">
      Back to traces
    </Link>
  );

  if (isPending) {
    return (
      <>
        {backLink}
        <h1 className="text-2xl font-semibold">Trace</h1>
        <p className="sr-only">Loading trace…</p>
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (!data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <>
        {backLink}
        <h1 className="text-2xl font-semibold">
          {notFound ? 'Trace not found' : 'Trace'}
        </h1>
        {notFound ? (
          <p>There is no trace with the ID {id}.</p>
        ) : (
          <ErrorState
            title="The trace could not be loaded"
            onRetry={() => refetch()}
          />
        )}
      </>
    );
  }

  const { trace, spans } = data;
  // A span ID that is not in this trace opens nothing.
  const selectedSpanId = spans.some((span) => span.id === spanParam)
    ? spanParam
    : null;

  return (
    <>
      {backLink}
      <h1 className="text-2xl font-semibold">{trace.operation}</h1>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Service</dt>
          <dd>{trace.service}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge status={trace.status} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="tabular-nums">{formatDuration(trace.durationMs)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Spans</dt>
          <dd className="tabular-nums">{trace.spanCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Started</dt>
          <dd className="tabular-nums">{formatDateTime(trace.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Trace ID</dt>
          <dd className="font-mono">{trace.id}</dd>
        </div>
      </dl>

      <div>
        <h2 className="text-lg font-semibold">Waterfall</h2>
        <p className="text-sm text-muted-foreground">
          Each row is one span, drawn where it ran. Select a row to see its
          details.
        </p>
      </div>
      <Waterfall
        spans={spans}
        totalMs={trace.durationMs}
        selectedSpanId={selectedSpanId}
        onSelectSpan={(spanId) => void setSpanParam(spanId)}
      />
    </>
  );
}
