import type { ReactNode } from 'react';
import { PageHeading } from '@/app/PageHeading';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { FilterSidebar } from '@/features/traces/FilterSidebar';
import { type TraceFilters, useTraceFilters } from '@/features/traces/filters';
import { useTraces } from '@/features/traces/hooks';
import { TraceFilterBar } from '@/features/traces/TraceFilterBar';
import { TraceResultsSkeleton } from '@/features/traces/TraceResults';
import { TracesHelp } from '@/features/traces/TracesHelp';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ChartSection } from '@/pages/traces/ChartSection';
import { ResultsSection } from '@/pages/traces/ResultsSection';

/**
 * Find slow or failing requests: filters on the left and on top, the chart,
 * then the list.
 */
export function TracesPage() {
  const { filters, hasFilters, setFilters, setPage, clearFilters } =
    useTraceFilters();

  // The search box and the duration fields update the URL on every key.
  // The request waits until typing stops.
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const debouncedMinMs = useDebouncedValue(filters.minMs, 300);
  const debouncedMaxMs = useDebouncedValue(filters.maxMs, 300);
  const query: TraceFilters = {
    ...filters,
    q: debouncedQ,
    minMs: debouncedMinMs,
    maxMs: debouncedMaxMs,
  };
  const { data, isPending, isPlaceholderData, refetch } = useTraces(query);

  // A zoom is a step the user may want to undo, so it gets its own entry in
  // the browser's history: Back returns to the range before it.
  const zoom = (range: Pick<TraceFilters, 'from' | 'to'>) =>
    setFilters(range, { push: true });

  let content: ReactNode;
  if (isPending) {
    content = (
      <>
        <Skeleton className="h-19 w-full" />
        <TraceResultsSkeleton />
      </>
    );
  } else if (!data) {
    content = (
      <ErrorState
        title="The traces could not be loaded"
        onRetry={() => refetch()}
      />
    );
  } else {
    content = (
      <>
        <ChartSection
          query={query}
          duration={{ minMs: filters.minMs, maxMs: filters.maxMs }}
          onChange={setFilters}
          onZoom={zoom}
        />
        <ResultsSection
          list={data}
          updating={isPlaceholderData}
          filters={filters}
          hasFilters={hasFilters}
          onChange={setFilters}
          onPageChange={setPage}
          onClearFilters={clearFilters}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeading title="Traces" />
        <TracesHelp />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <FilterSidebar filters={filters} list={data} onChange={setFilters} />

        <div className="min-w-0 flex-1 space-y-4">
          <TraceFilterBar filters={filters} onChange={setFilters} />
          {content}
        </div>
      </div>
    </>
  );
}
