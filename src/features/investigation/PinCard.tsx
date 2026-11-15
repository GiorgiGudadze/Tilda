import { CircleCheckBig, CircleDot } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DecisionSummary } from '@/features/investigation/DecisionSummary';
import { useSavePin } from '@/features/investigation/hooks';
import { NoteForm } from '@/features/investigation/NoteForm';
import type { Pin } from '@/features/investigation/schemas';
import { UnpinButton } from '@/features/investigation/UnpinButton';
import { formatDateTime, formatDuration } from '@/lib/format';

/** One pinned trace: its cause, its note, and whether it is resolved. */
export function PinCard({ pin }: { pin: Pin }) {
  const headingId = useId();
  const saveStatus = useSavePin(
    'The status could not be changed. It is back as it was.',
  );
  const resolved = pin.status === 'resolved';
  const { trace } = pin;

  function toggleResolved() {
    saveStatus.mutate({
      trace,
      changes: { status: resolved ? 'open' : 'resolved' },
    });
  }

  return (
    <article
      aria-labelledby={headingId}
      className="space-y-4 rounded-lg border p-4 text-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="space-y-1">
          <h2 id={headingId} className="text-base font-semibold">
            <Link
              to={`/traces/${trace.id}`}
              className="underline underline-offset-4"
            >
              {trace.operation}
            </Link>
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>{trace.service}</span>
            <StatusBadge status={trace.status} />
            <span className="tabular-nums">
              {formatDuration(trace.durationMs)}
            </span>
            <span className="tabular-nums">
              {formatDateTime(trace.startedAt)}
            </span>
          </p>
        </div>
        <p className="inline-flex items-center gap-1 font-medium">
          {resolved ? (
            <CircleCheckBig aria-hidden="true" className="size-4" />
          ) : (
            <CircleDot aria-hidden="true" className="size-4" />
          )}
          {resolved ? 'Resolved' : 'Open'}
        </p>
      </header>

      <div className="space-y-1">
        <h3 className="font-medium">Cause</h3>
        <DecisionSummary decision={pin.decision} />
      </div>

      <NoteForm pin={pin} />

      <footer className="flex flex-wrap gap-2 border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          aria-label={`${resolved ? 'Reopen' : 'Mark as resolved'} ${trace.operation}`}
          onClick={toggleResolved}
        >
          {resolved ? 'Reopen' : 'Mark as resolved'}
        </Button>
        <UnpinButton pin={pin} />
      </footer>
    </article>
  );
}
