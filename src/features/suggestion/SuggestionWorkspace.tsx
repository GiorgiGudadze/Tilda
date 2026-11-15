import { useId, useState } from 'react';
import { SuggestionCard } from '@/components/SuggestionCard';
import { useSavePin } from '@/features/investigation/hooks';
import type { Decision, Pin } from '@/features/investigation/schemas';
import { evidenceOf, suggestionFrom } from '@/features/suggestion/decisions';
import { useSuggestionStream } from '@/features/suggestion/hooks';
import type { Suggestion } from '@/features/suggestion/schemas';
import {
  AskView,
  DecidedView,
  FailedView,
  ReviewView,
  StreamingView,
} from '@/features/suggestion/SuggestionViews';
import type { Span } from '@/features/traces/schemas';
import { spanRowId } from '@/features/traces/span-row-id';
import { Waterfall } from '@/features/traces/Waterfall';

interface SuggestionWorkspaceProps {
  /** The pin of this trace. The workspace exists only for a pinned trace. */
  pin: Pin;
  spans: Span[];
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string | null) => void;
}

/**
 * The waterfall of a pinned trace with the suggestion panel beside it
 * (under it on a small screen). They share one thing: the spans a
 * suggestion is based on are marked in the waterfall.
 */
export function SuggestionWorkspace({
  pin,
  spans,
  selectedSpanId,
  onSelectSpan,
}: SuggestionWorkspaceProps) {
  const titleId = useId();
  const stream = useSuggestionStream(pin.traceId);
  // "Change decision" was pressed: review the stored suggestion again.
  const [changing, setChanging] = useState(false);
  const saveDecision = useSavePin(
    'The decision could not be saved. Nothing was recorded.',
  );
  const { decision } = pin;
  const { state } = stream;

  // The suggestion that is on screen for review, if one is.
  const review: Suggestion | null = decision
    ? changing
      ? suggestionFrom(decision)
      : null
    : state.status === 'done'
      ? state.suggestion
      : null;

  // Mark evidence while a suggestion is reviewed, and after it is accepted.
  // An edited cause is the user's own, so the AI's evidence is not marked.
  const evidenceSpanIds = review
    ? evidenceOf(review)
    : decision?.kind === 'accepted'
      ? decision.evidenceSpanIds
      : [];

  function decide(next: Decision) {
    saveDecision.mutate({ trace: pin.trace, changes: { decision: next } });
    setChanging(false);
  }

  /** Follows an evidence link: opens the span and moves to its row. */
  function showSpan(spanId: string) {
    onSelectSpan(spanId);
    document.getElementById(spanRowId(spanId))?.focus();
  }

  // Said once when writing starts and once when the suggestion is complete.
  // The text is not read out word by word as it arrives.
  const announcement =
    decision || state.status === 'idle' || state.status === 'cancelled'
      ? ''
      : state.status === 'streaming'
        ? 'Writing a suggestion…'
        : state.status === 'done'
          ? `Suggestion ready. ${state.suggestion.text}`
          : '';

  const decided = decision !== null && !changing;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <Waterfall
        spans={spans}
        totalMs={pin.trace.durationMs}
        selectedSpanId={selectedSpanId}
        onSelectSpan={onSelectSpan}
        evidenceSpanIds={evidenceSpanIds}
      />

      <section aria-labelledby={titleId} className="lg:sticky lg:top-4">
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
        <SuggestionCard
          title={decided ? 'Cause' : 'Suggested cause'}
          titleId={titleId}
          variant={decided ? 'decided' : 'suggestion'}
        >
          {decided ? (
            <DecidedView
              decision={decision}
              spans={spans}
              onSelectSpan={showSpan}
              onChange={() => setChanging(true)}
            />
          ) : review ? (
            <ReviewView
              suggestion={review}
              spans={spans}
              onSelectSpan={showSpan}
              onDecide={decide}
              onKeep={decision ? () => setChanging(false) : undefined}
            />
          ) : state.status === 'streaming' ? (
            <StreamingView text={state.text} onStop={stream.stop} />
          ) : state.status === 'error' ? (
            <FailedView onRetry={stream.start} />
          ) : (
            <AskView
              stopped={state.status === 'cancelled'}
              onStart={stream.start}
            />
          )}
        </SuggestionCard>
      </section>
    </div>
  );
}
