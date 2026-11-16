import { DurationLines } from '@/components/DurationLines';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { StatTile } from '@/components/StatTile';
import { VolumeChart } from '@/components/VolumeChart';
import { DependencyList } from '@/features/services/Dependencies';
import { useServiceHealth } from '@/features/services/hooks';
import { ApiError } from '@/lib/api';
import { formatDuration, formatShare } from '@/lib/format';
import { type TimeRange, toBound } from '@/lib/time-range';

interface ServiceHealthProps {
  service: string;
  range: TimeRange | null;
  /** Sets the time range, from a click or a drag on the requests chart. */
  onZoom: (range: TimeRange) => void;
}

/**
 * How one service is doing: three numbers, the requests and the durations
 * over time, and the services on either side of it.
 */
export function ServiceHealth({ service, range, onZoom }: ServiceHealthProps) {
  const {
    data,
    isPending,
    isPlaceholderData,
    error: loadError,
    refetch,
  } = useServiceHealth(service, range);

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <p className="sr-only">Loading the service…</p>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!data) {
    return loadError instanceof ApiError && loadError.status === 404 ? (
      <EmptyState
        title={`There is no service called ${service}`}
        description="Pick one from the list above."
      />
    ) : (
      <ErrorState
        title="The service could not be loaded"
        onRetry={() => refetch()}
      />
    );
  }

  const steps = data.steps.map((step) => ({
    startMs: Date.parse(step.start),
    ...step,
  }));

  return (
    // The current numbers stay while the next service or range loads.
    <div className="space-y-6" aria-busy={isPlaceholderData}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Requests"
          value={String(data.calls)}
          detail={`calls to ${data.service}`}
          trend={steps.map((step) => step.ok + step.error)}
        />
        <StatTile
          label="Failed"
          value={data.calls === 0 ? '0%' : formatShare(data.failed, data.calls)}
          detail={`${data.failed} of ${data.calls} calls`}
          trend={steps.map((step) =>
            step.ok + step.error === 0
              ? null
              : step.error / (step.ok + step.error),
          )}
        />
        <StatTile
          label="Slowest 5%"
          value={data.p95Ms === null ? '–' : formatDuration(data.p95Ms)}
          detail={
            data.medianMs === null
              ? 'no calls to measure'
              : `typical call ${formatDuration(data.medianMs)}`
          }
          trend={steps.map((step) => step.p95Ms)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-1">
          <h2 className="text-base font-semibold">Requests</h2>
          <p className="text-sm text-muted-foreground">
            Calls to the service in each step, failed ones in red.
          </p>
          <VolumeChart
            bars={steps.map(({ startMs, ok, error }) => ({
              startMs,
              ok,
              error,
            }))}
            stepMs={data.stepMs}
            onZoom={({ fromMs, toMs }) =>
              onZoom({ from: toBound(fromMs), to: toBound(toMs) })
            }
          />
        </section>
        <section className="space-y-1">
          <h2 className="text-base font-semibold">Duration</h2>
          <p className="text-sm text-muted-foreground">
            How long a call took: the typical one, and the slowest 5%.
          </p>
          <DurationLines steps={steps} stepMs={data.stepMs} />
        </section>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Dependencies</h2>
          <p className="text-sm text-muted-foreground">
            Who calls this service, and what it calls, over the same time.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DependencyList
            title="Called by"
            empty="Nothing calls it: requests start here."
            items={data.callers}
            range={range}
          />
          <DependencyList
            title="Calls"
            empty="It calls nothing: it does the work itself."
            items={data.callees}
            range={range}
          />
        </div>
      </section>
    </div>
  );
}
