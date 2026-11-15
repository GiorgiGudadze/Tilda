import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  NEW_PIN,
  type Pin,
  type PinChanges,
  pinListSchema,
  pinSchema,
} from '@/features/investigation/schemas';
import type { TraceSummary } from '@/features/traces/schemas';
import { deleteResource, getJson, putJson } from '@/lib/api';

const PINS_KEY = ['pins'];

/**
 * Shared by every write to pins.
 *
 * `scope` puts them in one queue: they reach the server one at a time, in
 * the order the user made them. Without it a slow request could arrive
 * after a later one and undo it (pin, then unpin, could end as pinned).
 */
const PIN_WRITE = {
  mutationKey: ['pins', 'write'],
  scope: { id: 'pins' },
};

export function usePins() {
  return useQuery({
    queryKey: PINS_KEY,
    queryFn: ({ signal }) =>
      getJson('/api/investigation', pinListSchema, signal),
    // Pins change only through the writes below, and each write loads them
    // again when it finishes. Loading them at other times (on opening a
    // page, on returning to the tab) could fetch the list while a change is
    // still on its way, and show it without that change.
    staleTime: Infinity,
  });
}

/**
 * A new pin or a change to one. `changes` names only the fields to change.
 * The trace is needed to show a new pin before the server answers.
 */
interface SavePinInput {
  trace: TraceSummary;
  changes: PinChanges;
}

function savePin({ trace, changes }: SavePinInput) {
  return putJson(`/api/investigation/${trace.id}`, changes, pinSchema);
}

/** The list after a save: the pin is changed in place, or added at the top. */
function withSavedPin(pins: Pin[], { trace, changes }: SavePinInput): Pin[] {
  const existing = pins.find((item) => item.traceId === trace.id);
  const pin: Pin = {
    ...NEW_PIN,
    ...existing,
    ...changes,
    traceId: trace.id,
    trace,
  };
  return existing
    ? pins.map((item) => (item.traceId === trace.id ? pin : item))
    : [pin, ...pins];
}

/**
 * Shows a change in the cached pins before the server answers. Returns the
 * pins as they were, to put back if the request fails.
 */
async function changePinsNow(
  queryClient: QueryClient,
  change: (pins: Pin[]) => Pin[],
) {
  // A request that is already on its way must not overwrite the change.
  await queryClient.cancelQueries({ queryKey: PINS_KEY });
  const previous = queryClient.getQueryData<Pin[]>(PINS_KEY);
  queryClient.setQueryData<Pin[]>(PINS_KEY, change(previous ?? []));
  return { previous };
}

/**
 * Asks the server for the truth once the last write has finished. While
 * another write is waiting, a refetch would show the list without it.
 */
function refetchPinsWhenIdle(queryClient: QueryClient) {
  if (queryClient.isMutating({ mutationKey: PIN_WRITE.mutationKey }) === 1) {
    return queryClient.invalidateQueries({ queryKey: PINS_KEY });
  }
}

/**
 * Pin, Resolve, Reopen and the decision. The change shows at once. If the
 * request fails, the change is undone and a toast says so.
 */
export function useSavePin(failureMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...PIN_WRITE,
    mutationFn: savePin,
    onMutate: (input) =>
      changePinsNow(queryClient, (pins) => withSavedPin(pins, input)),
    onError: (_error, _input, context) => {
      queryClient.setQueryData(PINS_KEY, context?.previous);
      toast.error(failureMessage);
    },
    onSettled: () => refetchPinsWhenIdle(queryClient),
  });
}

/**
 * The note. It is not shown as saved before the server answers: the form has
 * a Save button and shows its own pending and failed states.
 */
export function useSaveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    ...PIN_WRITE,
    mutationFn: (input: { trace: TraceSummary; note: string }) =>
      savePin({ trace: input.trace, changes: { note: input.note } }),
    onSuccess: (saved) => {
      // Only the note is copied. Another change may be showing already.
      queryClient.setQueryData<Pin[]>(PINS_KEY, (pins) =>
        pins?.map((pin) =>
          pin.traceId === saved.traceId ? { ...pin, note: saved.note } : pin,
        ),
      );
    },
  });
}

/** Unpin. Shows at once, with the same undo as `useSavePin`. */
export function useUnpin() {
  const queryClient = useQueryClient();
  return useMutation({
    ...PIN_WRITE,
    mutationFn: (traceId: string) =>
      deleteResource(`/api/investigation/${traceId}`),
    onMutate: (traceId) =>
      changePinsNow(queryClient, (pins) =>
        pins.filter((pin) => pin.traceId !== traceId),
      ),
    onError: (_error, _traceId, context) => {
      queryClient.setQueryData(PINS_KEY, context?.previous);
      toast.error('The trace could not be unpinned. It is still pinned.');
    },
    onSettled: () => refetchPinsWhenIdle(queryClient),
  });
}
