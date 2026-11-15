import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import {
  DURATION_BUCKET_KEYS,
  type DurationBucketKey,
} from '@/features/traces/duration-buckets';
import {
  sortSchema,
  statusSchema,
  type Sort,
  type Status,
} from '@/features/traces/schemas';

/** What the list is asked to show. It lives in the URL, so a link keeps it. */
export interface TraceFilters {
  q: string;
  service: string;
  status: Status | null;
  duration: DurationBucketKey | null;
  sort: Sort;
  page: number;
}

/** The parts of `TraceFilters` that narrow the list. Sort and page do not. */
type Narrowing = Pick<TraceFilters, 'q' | 'service' | 'status' | 'duration'>;

// One parser per URL parameter. A value that does not parse counts as absent.
const parsers = {
  q: parseAsString.withDefault(''),
  service: parseAsString.withDefault(''),
  status: parseAsStringLiteral(statusSchema.options),
  duration: parseAsStringLiteral(DURATION_BUCKET_KEYS),
  sort: parseAsStringLiteral(sortSchema.options).withDefault('newest'),
  page: parseAsInteger.withDefault(1),
};

export function useTraceFilters() {
  const [params, setParams] = useQueryStates(parsers);

  const filters: TraceFilters = { ...params, page: Math.max(1, params.page) };

  const hasFilters =
    filters.q !== '' ||
    filters.service !== '' ||
    filters.status !== null ||
    filters.duration !== null;

  return {
    filters,
    hasFilters,
    /** Changes filters or the sort order. Always returns to page 1. */
    setFilters(patch: Partial<Narrowing & Pick<TraceFilters, 'sort'>>) {
      void setParams({ ...patch, page: null });
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
        duration: null,
        page: null,
      });
    },
  };
}

/** The query string of `GET /api/traces` for these filters. */
export function toSearchParams(filters: TraceFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.service) params.set('service', filters.service);
  if (filters.status) params.set('status', filters.status);
  if (filters.duration) params.set('duration', filters.duration);
  params.set('sort', filters.sort);
  params.set('page', String(filters.page));
  return params.toString();
}
