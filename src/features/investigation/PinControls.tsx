import { Pin as PinIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { usePins, useSavePin } from '@/features/investigation/hooks';
import { UnpinButton } from '@/features/investigation/UnpinButton';
import type { TraceSummary } from '@/features/traces/schemas';

/**
 * The pin state of one trace, on the trace page. Not pinned: the primary
 * "Pin trace" button. Pinned: a marker, a link to the record, and Unpin.
 */
export function PinControls({ trace }: { trace: TraceSummary }) {
  const { data: pins, isPending, refetch } = usePins();
  const pinTrace = useSavePin(
    'The trace could not be pinned. Nothing was saved.',
  );

  if (isPending) {
    return <Skeleton className="h-8 w-28" />;
  }

  if (!pins) {
    return (
      <p role="alert" className="text-sm">
        The pin could not be loaded.{' '}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </p>
    );
  }

  const pin = pins.find((item) => item.traceId === trace.id);

  if (!pin) {
    return (
      <Button
        onClick={() =>
          // No changes: a new pin starts open, with no note and no cause.
          pinTrace.mutate({ trace, changes: {} })
        }
      >
        <PinIcon aria-hidden="true" />
        Pin trace
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1 font-medium">
        <PinIcon aria-hidden="true" className="size-4" />
        Pinned
      </span>
      <Link to="/investigation" className="underline underline-offset-4">
        Open investigation
      </Link>
      <UnpinButton pin={pin} />
    </div>
  );
}
