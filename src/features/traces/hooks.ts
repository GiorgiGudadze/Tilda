import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toSearchParams, type TraceFilters } from '@/features/traces/filters';
import {
  serviceListSchema,
  traceDetailSchema,
  traceListSchema,
} from '@/features/traces/schemas';
import { getJson } from '@/lib/api';

export function useTraces(filters: TraceFilters) {
  return useQuery({
    queryKey: ['traces', 'list', filters],
    queryFn: ({ signal }) =>
      getJson(
        `/api/traces?${toSearchParams(filters)}`,
        traceListSchema,
        signal,
      ),
    // While the next page or filter loads, keep showing the current rows.
    placeholderData: keepPreviousData,
  });
}

export function useTrace(id: string) {
  return useQuery({
    queryKey: ['traces', 'detail', id],
    queryFn: ({ signal }) =>
      getJson(
        `/api/traces/${encodeURIComponent(id)}`,
        traceDetailSchema,
        signal,
      ),
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: ({ signal }) =>
      getJson('/api/services', serviceListSchema, signal),
    // The list of services does not change while the app is open.
    staleTime: Infinity,
  });
}
