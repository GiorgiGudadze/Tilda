import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';
import { traceDetailSchema, traceListSchema } from '@/features/traces/schemas';

export function useTraces() {
  return useQuery({
    queryKey: ['traces', 'list'],
    queryFn: ({ signal }) => getJson('/api/traces', traceListSchema, signal),
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
