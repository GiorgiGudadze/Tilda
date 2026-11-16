import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { useDecisions } from '@/features/suggestion/decision-hooks';
import type { TraceFilters } from '@/features/traces/filters';
import { PAGE_SIZE, type TraceList } from '@/features/traces/schemas';
import { TraceCards, TraceTable } from '@/features/traces/TraceResults';
import { useMediaQuery } from '@/lib/use-media-query';

interface ResultsSectionProps {
  list: TraceList;
  /** The rows on screen are the previous ones, while the next ones load. */
  updating: boolean;
  filters: TraceFilters;
  hasFilters: boolean;
  onChange: (patch: Partial<TraceFilters>) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

/** What the count line says, read out when the results change. */
function countText(list: TraceList, firstRow: number, updating: boolean) {
  if (updating) return 'Updating…';
  if (list.total === 0) return 'No traces';
  return `${firstRow} to ${firstRow + list.items.length - 1} of ${list.total} traces`;
}

/** Nothing to list: either the filters exclude everything, or there is nothing. */
function NoResults({
  hasFilters,
  onClearFilters,
}: Pick<ResultsSectionProps, 'hasFilters' | 'onClearFilters'>) {
  if (!hasFilters) {
    return (
      <EmptyState
        title="No traces yet"
        description="Traces appear here as requests come in."
      />
    );
  }
  return (
    <EmptyState
      icon={SearchX}
      title="No traces match these filters"
      description="Try a different search, service, status, name, duration or time."
      action={
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      }
    />
  );
}

/**
 * The count, the traces as a table (cards on a phone), and the pages.
 *
 * The reviewed marker is worked out here from the stored decisions, not
 * sent with the list.
 */
export function ResultsSection({
  list,
  updating,
  filters,
  hasFilters,
  onChange,
  onPageChange,
  onClearFilters,
}: ResultsSectionProps) {
  const { data: decisions = [] } = useDecisions();
  const reviewedIds = new Set(decisions.map((item) => item.traceId));
  // A table needs width. Phones get cards.
  const isWide = useMediaQuery('(min-width: 640px)');

  // The API answers a page beyond the last with the last page, so show that
  // page's number instead of the one in the URL.
  const pageCount = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const firstRow = (page - 1) * PAGE_SIZE + 1;

  return (
    <>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {countText(list, firstRow, updating)}
      </p>

      {list.total === 0 ? (
        <NoResults hasFilters={hasFilters} onClearFilters={onClearFilters} />
      ) : (
        <>
          {/* The current rows stay while the next page or filter loads. */}
          <div aria-busy={updating}>
            {isWide ? (
              <TraceTable
                traces={list.items}
                reviewedIds={reviewedIds}
                sort={filters.sort}
                onSort={(sort) => onChange({ sort })}
              />
            ) : (
              <TraceCards traces={list.items} reviewedIds={reviewedIds} />
            )}
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />
        </>
      )}
    </>
  );
}
