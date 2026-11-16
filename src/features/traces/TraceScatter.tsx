import { DurationScatter } from '@/components/DurationScatter';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import {
  type DurationRange,
  isEmptyRange,
} from '@/features/traces/duration-range';
import type { PointFilters, TraceFilters } from '@/features/traces/filters';
import { useTracePoints } from '@/features/traces/hooks';
import { toBound } from '@/lib/time-range';

interface TraceScatterProps {
  filters: PointFilters;
  /** The duration filter, shaded on the plot. */
  duration: DurationRange;
  /** Sets the time range, from a drag across the plot. */
  onZoom: (patch: Pick<TraceFilters, 'from' | 'to'>) => void;
}

/** The scatter view of the traces page. Its points load only when it is shown. */
export function TraceScatter({ filters, duration, onZoom }: TraceScatterProps) {
  const { data, isPending, refetch } = useTracePoints(filters);

  if (isPending) {
    return <Skeleton className="h-64 w-full sm:h-52" />;
  }
  if (!data) {
    return (
      <ErrorState
        title="The chart could not be loaded"
        onRetry={() => refetch()}
      />
    );
  }

  // Shade the range when there is one to shade.
  const band =
    (duration.minMs === null && duration.maxMs === null) ||
    isEmptyRange(duration)
      ? null
      : { minMs: duration.minMs ?? 0, maxMs: duration.maxMs ?? Infinity };
  const points = data.points.map((point) => ({
    id: point.id,
    timeMs: Date.parse(point.startedAt),
    durationMs: point.durationMs,
    failed: point.status === 'error',
    name: point.operation,
    href: `/traces/${point.id}`,
  }));

  return (
    <>
      <DurationScatter
        points={points}
        band={band}
        onZoom={({ fromMs, toMs }) =>
          onZoom({ from: toBound(fromMs), to: toBound(toMs) })
        }
      />
      {data.total > data.points.length && (
        <p className="text-sm text-muted-foreground">
          {`Showing the newest ${data.points.length.toLocaleString('en-GB')} of ${data.total.toLocaleString('en-GB')} traces.`}
        </p>
      )}
    </>
  );
}
