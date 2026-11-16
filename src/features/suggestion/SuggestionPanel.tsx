import { useId } from 'react';
import { Skeleton } from '@/components/Skeleton';
import { SuggestionCard } from '@/components/SuggestionCard';
import { Button } from '@/components/ui/button';
import {
  AskView,
  DecidedView,
  FailedView,
  ReviewView,
  StreamingView,
} from '@/features/suggestion/SuggestionViews';
import type { SuggestionReview } from '@/features/suggestion/use-suggestion-review';
import type { Span } from '@/lib/trace-model';

/** Said once when writing starts and once when the suggestion is complete. */
function announcementOf({ decision, stream }: SuggestionReview): string {
  const { state } = stream;
  if (decision) return '';
  if (state.status === 'streaming') return 'Writing a suggestion…';
  if (state.status === 'done')
    return `Suggestion ready. ${state.suggestion.text}`;
  return '';
}

interface SuggestionPanelProps {
  review: SuggestionReview;
  spans: Span[];
  /** Follows an evidence link to its span. */
  onShowSpan: (spanId: string) => void;
}

/** The body of the panel: one view for each step of the review. */
function PanelBody({ review, spans, onShowSpan }: SuggestionPanelProps) {
  const { decisions, decision, stream } = review;
  const { state } = stream;

  // Until the decisions load, one made earlier is not known, and offering
  // a new suggestion could hide it.
  if (decisions.isPending) {
    return <Skeleton className="h-8 w-32" />;
  }
  if (!decisions.data) {
    return (
      <div role="alert" className="space-y-3 text-sm">
        <p>An earlier decision about this trace could not be loaded.</p>
        <Button variant="outline" onClick={() => decisions.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  if (review.decided && decision) {
    return (
      <DecidedView
        decision={decision}
        spans={spans}
        onSelectSpan={onShowSpan}
        onChange={review.change}
      />
    );
  }
  if (review.review) {
    return (
      <ReviewView
        suggestion={review.review}
        spans={spans}
        onSelectSpan={onShowSpan}
        onDecide={review.decide}
        onKeep={decision ? review.keep : undefined}
      />
    );
  }
  if (state.status === 'streaming') {
    return <StreamingView text={state.text} onStop={stream.stop} />;
  }
  if (state.status === 'error') {
    return <FailedView onRetry={stream.start} />;
  }
  return (
    <AskView stopped={state.status === 'cancelled'} onStart={stream.start} />
  );
}

/**
 * The suggested cause of a trace, beside its waterfall (under it on a small
 * screen). The text is announced once when complete, not word by word.
 */
export function SuggestionPanel(props: SuggestionPanelProps) {
  const titleId = useId();
  const { decided } = props.review;
  return (
    <section aria-labelledby={titleId} className="lg:sticky lg:top-4">
      <p aria-live="polite" className="sr-only">
        {announcementOf(props.review)}
      </p>
      <SuggestionCard
        title={decided ? 'Cause' : 'Suggested cause'}
        titleId={titleId}
        variant={decided ? 'decided' : 'suggestion'}
      >
        <PanelBody {...props} />
      </SuggestionCard>
    </section>
  );
}
