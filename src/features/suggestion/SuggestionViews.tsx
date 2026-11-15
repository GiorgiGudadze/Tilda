import { ChevronDown, ChevronRight, Square } from 'lucide-react';
import { useId, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { Button } from '@/components/ui/button';
import { DecisionSummary } from '@/features/investigation/DecisionSummary';
import type { Decision } from '@/features/investigation/schemas';
import { CauseForm } from '@/features/suggestion/CauseForm';
import {
  accept,
  edit,
  evidenceOf,
  reject,
} from '@/features/suggestion/decisions';
import type { Suggestion } from '@/features/suggestion/schemas';
import type { Span } from '@/features/traces/schemas';

/** What the views need to show evidence as links to spans. */
interface EvidenceProps {
  spans: Span[];
  onSelectSpan: (spanId: string) => void;
}

/**
 * The spans a suggestion is based on, each as a link to its row in the
 * waterfall. A claim that cannot be checked against its source is not
 * worth much.
 */
function EvidenceList({
  spanIds,
  spans,
  onSelectSpan,
}: EvidenceProps & { spanIds: string[] }) {
  const evidence = spans.filter((span) => spanIds.includes(span.id));
  if (evidence.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="font-medium">Evidence</p>
      <ul className="space-y-0.5">
        {evidence.map((span) => (
          <li key={span.id}>
            <button
              type="button"
              className="rounded-sm text-left underline underline-offset-4"
              onClick={() => onSelectSpan(span.id)}
            >
              {span.service}: {span.operation}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Nothing asked yet, or the last request was stopped. */
export function AskView({
  stopped,
  onStart,
}: {
  stopped: boolean;
  onStart: () => void;
}) {
  return (
    <>
      <p className="text-muted-foreground">
        {stopped
          ? 'The suggestion was stopped.'
          : 'Ask for a suggested cause. You decide whether it goes on record.'}
      </p>
      <Button onClick={onStart}>Suggest cause</Button>
    </>
  );
}

/** The text so far, and a way to stop it. */
export function StreamingView({
  text,
  onStop,
}: {
  text: string;
  onStop: () => void;
}) {
  return (
    <>
      <p>{text || 'Looking at the trace…'}</p>
      <Button variant="outline" onClick={onStop}>
        <Square aria-hidden="true" />
        Stop
      </Button>
    </>
  );
}

export function FailedView({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <p role="alert">
        The suggestion could not be loaded. Nothing was recorded.
      </p>
      <Button onClick={onRetry}>Retry</Button>
    </>
  );
}

interface ReviewViewProps extends EvidenceProps {
  suggestion: Suggestion;
  onDecide: (decision: Decision) => void;
  /** Given when a decision already exists: a way to leave it as it is. */
  onKeep?: () => void;
}

/**
 * A finished suggestion, waiting for a person: accept it, write the cause
 * yourself, or reject it.
 */
export function ReviewView({
  suggestion,
  spans,
  onSelectSpan,
  onDecide,
  onKeep,
}: ReviewViewProps) {
  const [editing, setEditing] = useState(false);
  const { outcome, text } = suggestion;
  const keep = onKeep && (
    <Button variant="ghost" onClick={onKeep}>
      Keep the current decision
    </Button>
  );

  // Rule 7: nothing looks wrong, so there is nothing to accept or reject.
  if (outcome.kind === 'no-finding') {
    return (
      <>
        <p>{text}</p>
        {editing ? (
          <CauseForm
            initialText=""
            onSave={(cause) => onDecide(edit(suggestion, cause))}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEditing(true)}>
              Write a cause yourself
            </Button>
            {keep}
          </div>
        )}
      </>
    );
  }

  // With low confidence the suggestion is a starting point at best, so the
  // main action is to write the cause, not to accept it.
  const unsure = outcome.confidence === 'low';

  return (
    <>
      <p>{text}</p>
      <ConfidenceBadge confidence={outcome.confidence} basis={outcome.basis} />
      <EvidenceList
        spanIds={evidenceOf(suggestion)}
        spans={spans}
        onSelectSpan={onSelectSpan}
      />
      {editing ? (
        <CauseForm
          initialText={text}
          onSave={(cause) => onDecide(edit(suggestion, cause))}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            This is a suggestion. It goes on record only when you accept or edit
            it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={unsure ? 'outline' : 'default'}
              onClick={() => onDecide(accept(suggestion))}
            >
              Accept
            </Button>
            <Button
              variant={unsure ? 'default' : 'outline'}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => onDecide(reject(suggestion))}
            >
              Reject
            </Button>
            {keep}
          </div>
        </>
      )}
    </>
  );
}

interface DecidedViewProps extends EvidenceProps {
  decision: Decision;
  onChange: () => void;
}

/** The cause on record, with the decision that put it there. */
export function DecidedView({
  decision,
  spans,
  onSelectSpan,
  onChange,
}: DecidedViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const originalId = useId();
  const Chevron = showOriginal ? ChevronDown : ChevronRight;

  const evidence = (
    <EvidenceList
      spanIds={decision.evidenceSpanIds}
      spans={spans}
      onSelectSpan={onSelectSpan}
    />
  );

  return (
    <>
      <DecisionSummary decision={decision} />

      {decision.kind === 'accepted' && evidence}

      {decision.kind === 'edited' && (
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={showOriginal}
            aria-controls={showOriginal ? originalId : undefined}
            className="inline-flex items-center gap-1 rounded-sm underline underline-offset-4"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <Chevron aria-hidden="true" className="size-4 shrink-0" />
            View original AI text
          </button>
          {showOriginal && (
            <div
              id={originalId}
              className="space-y-2 border-l-2 pl-3 text-muted-foreground"
            >
              <p>{decision.originalText}</p>
              {decision.confidence && (
                <ConfidenceBadge
                  confidence={decision.confidence}
                  basis={decision.basis}
                />
              )}
              {evidence}
            </div>
          )}
        </div>
      )}

      <Button variant="outline" onClick={onChange}>
        Change decision
      </Button>
    </>
  );
}
