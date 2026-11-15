import { SearchX } from 'lucide-react';
import { DurationChart } from '@/components/DurationChart';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { usePins } from '@/features/investigation/hooks';
import { DURATION_BUCKETS } from '@/features/traces/duration-buckets';
import { useTraceFilters } from '@/features/traces/filters';
import { useTraces } from '@/features/traces/hooks';
import { PAGE_SIZE } from '@/features/traces/schemas';
import { TraceFilterBar } from '@/features/traces/TraceFilterBar';
import {
  TraceCards,
  TraceResultsSkeleton,
  TraceTable,
} from '@/features/traces/TraceResults';
import { TracesHelp } from '@/features/traces/TracesHelp';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useMediaQuery } from '@/lib/use-media-query';

export function TracesPage() {
  const { filters, hasFilters, setFilters, setPage, clearFilters } =
    useTraceFilters();

  // The search box updates the URL on every key. The request waits until
  // typing stops.
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const { data, isPending, isPlaceholderData, refetch } = useTraces({
    ...filters,
    q: debouncedQ,
  });

  // The pinned marker is worked out here from the pins, not sent with the list.
  const { data: pins = [] } = usePins();
  const pinnedIds = new Set(pins.map((pin) => pin.traceId));

  // A table needs width. Phones get cards.
  const isWide = useMediaQuery('(min-width: 640px)');

  // The API answers a page beyond the last with the last page, so show that
  // page's number instead of the one in the URL.
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const page = Math.min(filters.page, pageCount);
  const firstRow = (page - 1) * PAGE_SIZE + 1;

  const bars = DURATION_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: data?.buckets.find((item) => item.key === bucket.key)?.count ?? 0,
  }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Traces</h1>
        <TracesHelp />
      </div>

      <TraceFilterBar filters={filters} onChange={setFilters} />

      {isPending ? (
        <>
          <Skeleton className="h-19 w-full" />
          <TraceResultsSkeleton />
        </>
      ) : !data ? (
        <ErrorState
          title="The traces could not be loaded"
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <DurationChart
            bars={bars}
            selectedKey={filters.duration}
            onSelect={(duration) => setFilters({ duration })}
          />

          {/* Read out when the results change. */}
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {isPlaceholderData
              ? 'Updating…'
              : data.total === 0
                ? 'No traces'
                : `${firstRow} to ${firstRow + data.items.length - 1} of ${data.total} traces`}
          </p>

          {data.total === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="No traces match these filters"
                description="Try a different search, service, status or duration."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No traces yet"
                description="Traces appear here as requests come in."
              />
            )
          ) : (
            <>
              {/* The current rows stay while the next page or filter loads. */}
              <div aria-busy={isPlaceholderData}>
                {isWide ? (
                  <TraceTable traces={data.items} pinnedIds={pinnedIds} />
                ) : (
                  <TraceCards traces={data.items} pinnedIds={pinnedIds} />
                )}
              </div>
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
