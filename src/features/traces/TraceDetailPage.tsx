import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useTrace } from '@/features/traces/hooks';
import { STATUS_LABELS } from '@/features/traces/status';
import { Waterfall } from '@/features/traces/Waterfall';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatDuration } from '@/lib/format';

export function TraceDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, error, refetch } = useTrace(id);

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
        <p>Loading trace…</p>
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
          <div role="alert" className="space-y-3">
            <p>The trace could not be loaded.</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        )}
      </>
    );
  }

  const { trace, spans } = data;

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
          <dd>{STATUS_LABELS[trace.status]}</dd>
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

      <h2 className="text-lg font-semibold">Waterfall</h2>
      <Waterfall spans={spans} totalMs={trace.durationMs} />
    </>
  );
}
