import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toHealthSearchParams } from '@/features/services/filters';
import { serviceHealthSchema } from '@/features/services/schemas';
import { getJson } from '@/lib/api';
import type { TimeRange } from '@/lib/time-range';

export function useServiceHealth(service: string, range: TimeRange | null) {
  return useQuery({
    queryKey: ['services', 'health', service, range],
    queryFn: ({ signal }) =>
      getJson(
        `/api/services/${encodeURIComponent(service)}/health?${toHealthSearchParams(range)}`,
        serviceHealthSchema,
        signal,
      ),
    // While another service or range loads, keep showing the current one.
    placeholderData: keepPreviousData,
    // A missing service stays missing: no retries, so the page says so at once.
    retry: false,
  });
}
