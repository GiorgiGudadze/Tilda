import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { VolumeChart } from '@/components/VolumeChart';
import type { TraceFilters, VolumeFilters } from '@/features/traces/filters';
import { useTraceVolume } from '@/features/traces/hooks';
import { toBound } from '@/lib/time-range';

interface TraceVolumeProps {
  filters: VolumeFilters;
  /** Sets the time range, from a click or a drag on the chart. */
  onZoom: (patch: Pick<TraceFilters, 'from' | 'to'>) => void;
}

/**
 * The volume view of the traces page: traces per step of time. A click or
 * a drag sets the time range to those bars, as UTC times to the minute.
 */
export function TraceVolume({ filters, onZoom }: TraceVolumeProps) {
  const { data, isPending, refetch } = useTraceVolume(filters);

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

  return (
    <VolumeChart
      bars={data.bars.map((bar) => ({
        startMs: Date.parse(bar.start),
        ok: bar.ok,
        error: bar.error,
      }))}
      stepMs={data.stepMs}
      onZoom={({ fromMs, toMs }) =>
        onZoom({ from: toBound(fromMs), to: toBound(toMs) })
      }
    />
  );
}
