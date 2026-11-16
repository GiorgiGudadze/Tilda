import { ArrowLeft } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { Link, useParams } from 'react-router';
import { PageHeading } from '@/app/PageHeading';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { useTrace } from '@/features/traces/hooks';
import { ApiError } from '@/lib/api';
import { formatDateTime, formatDuration } from '@/lib/format';
import { TraceWorkspace } from '@/pages/trace/TraceWorkspace';

export function TraceDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, error, refetch } = useTrace(id);
  // The open span is in the URL, so a link can point at one step.
  const [spanParam, setSpanParam] = useQueryState('span', parseAsString);

  // It looks like a button but stays a link: it goes to another page, so a
  // screen reader should call it a link, and it can open in a new tab.
  const backLink = (
    <Button asChild variant="outline" size="sm" className="self-start">
      <Link to="/traces">
        <ArrowLeft aria-hidden="true" />
        Back to traces
      </Link>
    </Button>
  );

  const notFound = error instanceof ApiError && error.status === 404;
  let title = 'Trace';
  if (data) {
    title = data.trace.operation;
  } else if (notFound) {
    title = 'Trace not found';
  }

  // The heading is the same element in every state, so it keeps the focus
  // it was given on arrival while the trace loads.
  const header = (
    <>
      {backLink}
      <PageHeading title={title} />
    </>
  );

  if (isPending) {
    return (
      <>
        {header}
        <p className="sr-only">Loading trace…</p>
        <Skeleton className="h-10 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (!data) {
    return (
      <>
        {header}
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
  const selectSpan = (spanId: string | null) => void setSpanParam(spanId);

  return (
    <>
      {header}

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
      {/* Every trace gets the suggestion panel beside its waterfall. The key
          gives another trace a fresh review. */}
      <TraceWorkspace
        key={trace.id}
        trace={trace}
        spans={spans}
        selectedSpanId={selectedSpanId}
        onSelectSpan={selectSpan}
      />
    </>
  );
}
