import { useEffect, useReducer, useRef } from 'react';
import {
  initialStreamState,
  streamReducer,
} from '@/features/suggestion/reducer';
import { suggestionEventSchema } from '@/features/suggestion/schemas';
import { postJsonLines } from '@/lib/api';

/**
 * Asks for a suggested cause and follows it as it streams in.
 *
 * `start` begins a request (and drops any earlier one), `stop` ends it.
 * The request is also ended when the component goes away, so nothing keeps
 * streaming after the user leaves the page.
 */
export function useSuggestionStream(traceId: string) {
  const [state, dispatch] = useReducer(streamReducer, initialStreamState);
  // The request in flight, so it can be aborted.
  const request = useRef<AbortController | null>(null);

  function start() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    // After an abort, late results from this request must not reach the
    // state. The reducer would ignore most of them, but not a new request's.
    const isCurrent = () => request.current === controller;

    dispatch({ type: 'started' });
    postJsonLines(
      `/api/traces/${encodeURIComponent(traceId)}/suggestion`,
      suggestionEventSchema,
      (event) => {
        if (isCurrent()) dispatch({ type: 'event', event });
      },
      controller.signal,
    ).then(
      () => {
        if (isCurrent()) dispatch({ type: 'ended' });
      },
      () => {
        if (isCurrent()) dispatch({ type: 'failed' });
      },
    );
  }

  function stop() {
    request.current?.abort();
    request.current = null;
    dispatch({ type: 'stopped' });
  }

  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  return { state, start, stop };
}
