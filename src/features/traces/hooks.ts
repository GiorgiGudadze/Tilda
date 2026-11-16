import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  type PointFilters,
  toPointSearchParams,
  toSearchParams,
  toVolumeSearchParams,
  type TraceFilters,
  type VolumeFilters,
} from '@/features/traces/filters';
import {
  serviceListSchema,
  traceDetailSchema,
  traceListSchema,
  tracePointsSchema,
  traceVolumeSchema,
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

/**
 * The traces as dots for the scatter plot. Only the plot calls it, so the
 * volume view never loads the points.
 */
export function useTracePoints(filters: PointFilters) {
  const { q, service, status, name, from, to } = filters;
  const point = { q, service, status, name, from, to };
  return useQuery({
    queryKey: ['traces', 'points', point],
    queryFn: ({ signal }) =>
      getJson(
        `/api/traces/points?${toPointSearchParams(point)}`,
        tracePointsSchema,
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * Traces per step of time, for the volume chart. Only the chart calls it,
 * so the scatter view never loads it.
 */
export function useTraceVolume(filters: VolumeFilters) {
  const { q, service, status, name, minMs, maxMs, from, to } = filters;
  const volume = { q, service, status, name, minMs, maxMs, from, to };
  return useQuery({
    queryKey: ['traces', 'volume', volume],
    queryFn: ({ signal }) =>
      getJson(
        `/api/traces/volume?${toVolumeSearchParams(volume)}`,
        traceVolumeSchema,
        signal,
      ),
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
