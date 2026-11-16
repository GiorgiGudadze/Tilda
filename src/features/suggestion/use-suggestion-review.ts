import { useState } from 'react';
import {
  useDecisions,
  useSaveDecision,
} from '@/features/suggestion/decision-hooks';
import { evidenceOf, suggestionFrom } from '@/features/suggestion/decisions';
import { useSuggestionStream } from '@/features/suggestion/hooks';
import type { Decision, Suggestion } from '@/features/suggestion/schemas';

/**
 * Everything about the suggested cause of one trace: the stream, the
 * decision made earlier, and whether it is being changed.
 *
 * Asking costs nothing and stores nothing; a decision is stored, kept after
 * a reload and marked in the traces list.
 *
 * It is a hook, not a part of the panel, because the page also needs one
 * thing from it: the spans to mark as evidence in the waterfall. The page
 * owns the layout of the two; this feature never draws the waterfall.
 */
export function useSuggestionReview(traceId: string) {
  const stream = useSuggestionStream(traceId);
  const decisions = useDecisions();
  const decision =
    decisions.data?.find((item) => item.traceId === traceId)?.decision ?? null;
  // "Change decision" was pressed: review the stored suggestion again.
  const [changing, setChanging] = useState(false);
  const saveDecision = useSaveDecision(
    'The decision could not be saved. Nothing was recorded.',
  );
  const { state } = stream;

  // The suggestion that is on screen for review, if one is.
  let review: Suggestion | null = null;
  if (decision) {
    review = changing ? suggestionFrom(decision) : null;
  } else if (state.status === 'done') {
    review = state.suggestion;
  }

  // Mark evidence while a suggestion is reviewed, and after it is accepted.
  // An edited cause is the user's own, so the AI's evidence is not marked.
  let evidenceSpanIds: string[] = [];
  if (review) {
    evidenceSpanIds = evidenceOf(review);
  } else if (decision?.kind === 'accepted') {
    evidenceSpanIds = decision.evidenceSpanIds;
  }

  return {
    stream,
    decisions,
    decision,
    review,
    evidenceSpanIds,
    /** A decision is on record and not being changed. */
    decided: decision !== null && !changing,
    decide(next: Decision) {
      saveDecision.mutate({ traceId, decision: next });
      setChanging(false);
    },
    change: () => setChanging(true),
    keep: () => setChanging(false),
  };
}

export type SuggestionReview = ReturnType<typeof useSuggestionReview>;
