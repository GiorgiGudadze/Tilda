import type {
  Outcome,
  Suggestion,
  SuggestionEvent,
} from '@/features/suggestion/schemas';

/**
 * The life of one suggestion request.
 *
 *   idle ──started──▶ streaming ──done line──▶ done
 *                         │
 *                         ├──failed, or cut off──▶ error
 *                         └──stopped─────────────▶ cancelled
 *
 * `started` begins again from any state (Retry, or Suggest after Stop).
 */
export type StreamState =
  | { status: 'idle' }
  | { status: 'streaming'; text: string; outcome: Outcome | null }
  | { status: 'done'; suggestion: Suggestion }
  | { status: 'error' }
  | { status: 'cancelled' };

type Streaming = Extract<StreamState, { status: 'streaming' }>;

export type StreamAction =
  | { type: 'started' }
  /** One line of the stream arrived. */
  | { type: 'event'; event: SuggestionEvent }
  /** The stream closed. */
  | { type: 'ended' }
  | { type: 'failed' }
  | { type: 'stopped' };

export const initialStreamState: StreamState = { status: 'idle' };

function applyEvent(state: Streaming, event: SuggestionEvent): StreamState {
  switch (event.type) {
    case 'meta':
      return { ...state, outcome: event.outcome };
    case 'text':
      return { ...state, text: state.text + event.text };
    case 'done':
      // A stream that says it is done without saying what it found is not
      // a suggestion.
      return state.outcome
        ? {
            status: 'done',
            suggestion: { text: state.text, outcome: state.outcome },
          }
        : { status: 'error' };
  }
}

export function streamReducer(
  state: StreamState,
  action: StreamAction,
): StreamState {
  if (action.type === 'started') {
    return { status: 'streaming', text: '', outcome: null };
  }

  // Everything else only matters while a stream is running. A line that
  // arrives after Stop, or after an error, changes nothing.
  if (state.status !== 'streaming') {
    return state;
  }

  switch (action.type) {
    case 'event':
      return applyEvent(state, action.event);
    case 'ended':
      // The stream closed before its `done` line: it was cut off.
      return { status: 'error' };
    case 'failed':
      return { status: 'error' };
    case 'stopped':
      return { status: 'cancelled' };
  }
}
