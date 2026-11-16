import { SuggestionPanel } from '@/features/suggestion/SuggestionPanel';
import { useSuggestionReview } from '@/features/suggestion/use-suggestion-review';
import { spanRowId } from '@/features/traces/span-row-id';
import { Waterfall } from '@/features/traces/Waterfall';
import type { Span, TraceSummary } from '@/lib/trace-model';

interface TraceWorkspaceProps {
  trace: TraceSummary;
  spans: Span[];
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string | null) => void;
}

/**
 * The waterfall of a trace with the suggestion panel beside it (under it on
 * a small screen). The page composes the two features; they share one
 * thing, the spans a suggestion is based on, which are marked in the
 * waterfall.
 *
 * The page renders it with `key={trace.id}`, so another trace starts with a
 * fresh review and never shows the previous trace's suggestion.
 */
export function TraceWorkspace({
  trace,
  spans,
  selectedSpanId,
  onSelectSpan,
}: TraceWorkspaceProps) {
  const review = useSuggestionReview(trace.id);

  /** Follows an evidence link: opens the span and moves to its row. */
  function showSpan(spanId: string) {
    onSelectSpan(spanId);
    document.getElementById(spanRowId(spanId))?.focus();
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <Waterfall
        spans={spans}
        totalMs={trace.durationMs}
        selectedSpanId={selectedSpanId}
        onSelectSpan={onSelectSpan}
        evidenceSpanIds={review.evidenceSpanIds}
      />
      <SuggestionPanel review={review} spans={spans} onShowSpan={showSpan} />
    </div>
  );
}
