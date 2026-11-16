import type { Decision } from '@/features/suggestion/schemas';
import type { Suggestion } from '@/features/suggestion/schemas';

/** The spans a suggestion is based on. None when it found nothing wrong. */
export function evidenceOf(suggestion: Suggestion): string[] {
  return suggestion.outcome.kind === 'finding'
    ? suggestion.outcome.evidenceSpanIds
    : [];
}

/**
 * The decision to store. Whatever the user decides, what the AI wrote and
 * what it was based on are kept beside it.
 */
function decisionFor(
  suggestion: Suggestion,
  kind: Decision['kind'],
  finalText: string,
): Decision {
  const { outcome } = suggestion;
  const finding = outcome.kind === 'finding' ? outcome : null;
  return {
    kind,
    originalText: suggestion.text,
    finalText,
    confidence: finding?.confidence ?? null,
    basis: finding?.basis ?? null,
    evidenceSpanIds: finding?.evidenceSpanIds ?? [],
  };
}

export function accept(suggestion: Suggestion): Decision {
  return decisionFor(suggestion, 'accepted', suggestion.text);
}

export function reject(suggestion: Suggestion): Decision {
  return decisionFor(suggestion, 'rejected', '');
}

/**
 * The user wrote the cause. Saving the AI's text unchanged is an accept, so
 * a cause is never labelled "edited by you" when nothing was edited.
 */
export function edit(suggestion: Suggestion, finalText: string): Decision {
  const unchanged =
    suggestion.outcome.kind === 'finding' &&
    finalText.trim() === suggestion.text.trim();
  return decisionFor(suggestion, unchanged ? 'accepted' : 'edited', finalText);
}

/**
 * The suggestion a decision was made about, rebuilt from what was stored.
 * "Change decision" shows this again. It does not ask the AI again.
 */
export function suggestionFrom(decision: Decision): Suggestion {
  return {
    text: decision.originalText,
    outcome: decision.confidence
      ? {
          kind: 'finding',
          confidence: decision.confidence,
          basis: decision.basis ?? '',
          evidenceSpanIds: decision.evidenceSpanIds,
        }
      : { kind: 'no-finding' },
  };
}
