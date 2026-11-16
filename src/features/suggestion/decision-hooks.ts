import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  type TraceDecision,
  traceDecisionListSchema,
  traceDecisionSchema,
} from '@/features/suggestion/schemas';
import { getJson, putJson } from '@/lib/api';

const DECISIONS_KEY = ['decisions'];

/**
 * Shared by every save of a decision.
 *
 * `scope` puts them in one queue: they reach the server one at a time, in
 * the order the user made them. Without it a slow request could arrive
 * after a later one and undo it (a changed decision could end as the
 * first one).
 */
const DECISION_WRITE = {
  mutationKey: ['decisions', 'write'],
  scope: { id: 'decisions' },
};

/** Every stored decision, newest first. */
export function useDecisions() {
  return useQuery({
    queryKey: DECISIONS_KEY,
    queryFn: ({ signal }) =>
      getJson('/api/decisions', traceDecisionListSchema, signal),
    // Decisions change only through the save below, which loads them again
    // when it finishes. Loading them at other times (on opening a page, on
    // returning to the tab) could fetch the list while a save is still on
    // its way, and show it without that save.
    staleTime: Infinity,
  });
}

function saveDecision({ traceId, decision }: TraceDecision) {
  return putJson(`/api/decisions/${traceId}`, decision, traceDecisionSchema);
}

/** The list after a save: the decision is replaced in place, or added first. */
function withSaved(list: TraceDecision[], saved: TraceDecision) {
  return list.some((item) => item.traceId === saved.traceId)
    ? list.map((item) => (item.traceId === saved.traceId ? saved : item))
    : [saved, ...list];
}

/**
 * Shows a change in the cached decisions before the server answers. Returns
 * the decisions as they were, to put back if the request fails.
 */
async function changeDecisionsNow(
  queryClient: QueryClient,
  change: (list: TraceDecision[]) => TraceDecision[],
) {
  // A request that is already on its way must not overwrite the change.
  await queryClient.cancelQueries({ queryKey: DECISIONS_KEY });
  const previous = queryClient.getQueryData<TraceDecision[]>(DECISIONS_KEY);
  queryClient.setQueryData<TraceDecision[]>(
    DECISIONS_KEY,
    change(previous ?? []),
  );
  return { previous };
}

/**
 * Asks the server for the truth once the last save has finished. While
 * another save is waiting, a refetch would show the list without it.
 */
function refetchWhenIdle(queryClient: QueryClient) {
  if (
    queryClient.isMutating({ mutationKey: DECISION_WRITE.mutationKey }) === 1
  ) {
    return queryClient.invalidateQueries({ queryKey: DECISIONS_KEY });
  }
}

/**
 * Saves the decision about a trace's cause. The change shows at once. If
 * the request fails, the change is undone and a toast says so.
 */
export function useSaveDecision(failureMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...DECISION_WRITE,
    mutationFn: saveDecision,
    onMutate: (input) =>
      changeDecisionsNow(queryClient, (list) => withSaved(list, input)),
    onError: (_error, _input, context) => {
      queryClient.setQueryData(DECISIONS_KEY, context?.previous);
      toast.error(failureMessage);
    },
    onSettled: () => refetchWhenIdle(queryClient),
  });
}
