import { parseAsString, useQueryStates } from 'nuqs';
import { parseAsBound } from '@/lib/time-range-param';
import type { TimeRange } from '@/lib/time-range';

/** What the Services page shows. It lives in the URL, so a link keeps it. */
interface ServiceFilters {
  /** Empty for the first service in the list. */
  service: string;
  /** As on the traces page: `now-6h`, or `null` for all time. */
  from: string | null;
  to: string | null;
}

const parsers = {
  service: parseAsString.withDefault(''),
  from: parseAsBound,
  to: parseAsBound,
};

interface ServiceFilterChangeOptions {
  /** Give the change its own entry in the browser's history. */
  push?: boolean;
}

export function useServiceFilters() {
  const [filters, setParams] = useQueryStates(parsers);
  return {
    filters: filters as ServiceFilters,
    setFilters(
      patch: Partial<ServiceFilters>,
      { push = false }: ServiceFilterChangeOptions = {},
    ) {
      return setParams(patch, { history: push ? 'push' : 'replace' });
    },
  };
}

/** The range in the filters, or `null` for all time. */
export function rangeOf(filters: ServiceFilters): TimeRange | null {
  return filters.from && filters.to
    ? { from: filters.from, to: filters.to }
    : null;
}

/** The query string of `GET /api/services/:name/health` for this range. */
export function toHealthSearchParams(range: TimeRange | null): string {
  const params = new URLSearchParams();
  if (range) {
    params.set('from', range.from);
    params.set('to', range.to);
  }
  return params.toString();
}

/** The address of the traces list for a service over this range. */
export function tracesHref(service: string, range: TimeRange | null): string {
  const params = new URLSearchParams(toHealthSearchParams(range));
  params.set('service', service);
  return `/traces?${params}`;
}

/** The address of a service's health over this range. */
export function serviceHref(service: string, range: TimeRange | null): string {
  const params = new URLSearchParams(toHealthSearchParams(range));
  params.set('service', service);
  return `/services?${params}`;
}
