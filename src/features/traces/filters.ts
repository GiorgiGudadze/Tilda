import {
  parseAsInteger,
  parseAsNativeArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import { statusSchema, type Status } from '@/lib/trace-model';
import { sortSchema, type Sort } from '@/features/traces/schemas';
import type { TimeRange } from '@/lib/time-range';
import { parseAsBound } from '@/lib/time-range-param';

/** The two ways to chart the traces. */
const CHART_VIEWS = ['scatter', 'volume'] as const;
export type ChartView = (typeof CHART_VIEWS)[number];

// The scatter plot is the default: it shows both when and how slow, and
// the slow hour stands out on it at once.
const chartParser = parseAsStringLiteral(CHART_VIEWS).withDefault('scatter');

/**
 * Which chart is shown, kept in the URL so a shared link opens the same one.
 * It is a view, not a filter: changing it keeps the page and the filters.
 */
export function useChartView() {
  return useQueryState('chart', chartParser);
}

/** What the list is asked to show. It lives in the URL, so a link keeps it. */
export interface TraceFilters {
  q: string;
  service: string;
  status: Status | null;
  /** Request names, as "GET /orders". A trace matches any. Empty for all. */
  name: string[];
  /** Whole milliseconds, both included. `null` leaves that end open. */
  minMs: number | null;
  maxMs: number | null;
  /** When the traces started, as `now-6h`. `null` for all time. */
  from: string | null;
  to: string | null;
  sort: Sort;
  page: number;
}

/** The parts of `TraceFilters` that narrow the list. Sort and page do not. */
type Narrowing = Pick<
  TraceFilters,
  'q' | 'service' | 'status' | 'name' | 'minMs' | 'maxMs' | 'from' | 'to'
>;

// One parser per URL parameter. A value that does not parse counts as absent.
const parsers = {
  q: parseAsString.withDefault(''),
  service: parseAsString.withDefault(''),
  status: parseAsStringLiteral(statusSchema.options),
  // Repeated in the URL, as the API takes it: `?name=A&name=B`.
  name: parseAsNativeArrayOf(parseAsString),
  minMs: parseAsInteger,
  maxMs: parseAsInteger,
  from: parseAsBound,
  to: parseAsBound,
  sort: parseAsStringLiteral(sortSchema.options).withDefault('newest'),
  page: parseAsInteger.withDefault(1),
};

function nonNegative(value: number | null): number | null {
  return value !== null && value >= 0 ? value : null;
}

export interface FilterChangeOptions {
  /** Add an entry to the browser's history instead of replacing the current one. */
  push?: boolean;
}

export function useTraceFilters() {
  const [params, setParams] = useQueryStates(parsers);

  const filters: TraceFilters = {
    ...params,
    // A duration below 0 makes no sense, so it counts as absent.
    minMs: nonNegative(params.minMs),
    maxMs: nonNegative(params.maxMs),
    page: Math.max(1, params.page),
  };

  const hasFilters =
    filters.q !== '' ||
    filters.service !== '' ||
    filters.status !== null ||
    filters.name.length > 0 ||
    filters.minMs !== null ||
    filters.maxMs !== null ||
    filters.from !== null ||
    filters.to !== null;

  return {
    filters,
    hasFilters,
    /**
     * Changes filters or the sort order. Always returns to page 1.
     *
     * A change replaces the current entry of the browser's history, so
     * typing a search does not leave one entry per key. With `push`, it adds
     * an entry instead, so Back returns to what was there before: that is
     * for a zoom, where Back is the way out.
     */
    setFilters(
      patch: Partial<Narrowing & Pick<TraceFilters, 'sort'>>,
      options: FilterChangeOptions = {},
    ) {
      void setParams(
        { ...patch, page: null },
        { history: options.push ? 'push' : 'replace' },
      );
    },
    setPage(page: number) {
      void setParams({ page });
    },
    /** Removes everything that narrows the list. Keeps the sort order. */
    clearFilters() {
      void setParams({
        q: null,
        service: null,
        status: null,
        name: null,
        minMs: null,
        maxMs: null,
        from: null,
        to: null,
        page: null,
      });
    },
  };
}

/** The filters the scatter plot uses: all but duration, sort and page. */
export type PointFilters = Pick<
  TraceFilters,
  'q' | 'service' | 'status' | 'name' | 'from' | 'to'
>;

/** The range in the filters, or `null` for all time. */
export function rangeOf(
  filters: Pick<TraceFilters, 'from' | 'to'>,
): TimeRange | null {
  return filters.from && filters.to
    ? { from: filters.from, to: filters.to }
    : null;
}

/** The query string of `GET /api/traces/points` for these filters. */
export function toPointSearchParams(filters: PointFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.service) params.set('service', filters.service);
  if (filters.status) params.set('status', filters.status);
  for (const name of filters.name) params.append('name', name);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params.toString();
}

/** The filters the volume chart uses: all but sort and page. */
export type VolumeFilters = Omit<TraceFilters, 'sort' | 'page'>;

/** The query string of `GET /api/traces/volume` for these filters. */
export function toVolumeSearchParams(filters: VolumeFilters): string {
  const params = new URLSearchParams(toPointSearchParams(filters));
  if (filters.minMs !== null) params.set('minMs', String(filters.minMs));
  if (filters.maxMs !== null) params.set('maxMs', String(filters.maxMs));
  return params.toString();
}

/** The query string of `GET /api/traces` for these filters. */
export function toSearchParams(filters: TraceFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.service) params.set('service', filters.service);
  if (filters.status) params.set('status', filters.status);
  for (const name of filters.name) params.append('name', name);
  if (filters.minMs !== null) params.set('minMs', String(filters.minMs));
  if (filters.maxMs !== null) params.set('maxMs', String(filters.maxMs));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  return params.toString();
}
