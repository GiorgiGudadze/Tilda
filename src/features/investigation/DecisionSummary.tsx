import { Ban, Check, Pencil } from 'lucide-react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import type { Decision } from '@/features/investigation/schemas';

const LABELS = {
  accepted: { text: 'Accepted by you', Icon: Check },
  edited: { text: 'Edited by you', Icon: Pencil },
  rejected: { text: 'Suggestion rejected, no cause recorded', Icon: Ban },
};

/**
 * The cause on record for a pinned trace, with a label that says a person
 * decided it. Without a decision there is no cause, whatever the AI wrote.
 */
export function DecisionSummary({ decision }: { decision: Decision | null }) {
  if (decision === null) {
    return <p className="text-muted-foreground">No cause recorded yet.</p>;
  }

  const { text, Icon } = LABELS[decision.kind];
  return (
    <div className="space-y-1">
      {decision.kind !== 'rejected' && <p>{decision.finalText}</p>}
      <p className="inline-flex items-center gap-1 text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        {text}
      </p>
      {/* The AI's confidence is about the AI's text. It is shown beside the
          cause only when that text is the cause. */}
      {decision.kind === 'accepted' && decision.confidence && (
        <ConfidenceBadge
          confidence={decision.confidence}
          basis={decision.basis}
        />
      )}
    </div>
  );
}
