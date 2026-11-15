import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { usePins } from '@/features/investigation/hooks';
import { PinCard } from '@/features/investigation/PinCard';

export function InvestigationPage() {
  const { data: pins, isPending, refetch } = usePins();

  return (
    <>
      <h1 className="text-2xl font-semibold">Investigation</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        The traces you pinned, each with its cause and your note. This is the
        record of what you found.
      </p>

      {isPending ? (
        <div className="space-y-4">
          <p className="sr-only">Loading pinned traces…</p>
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : !pins ? (
        <ErrorState
          title="The pinned traces could not be loaded"
          onRetry={() => refetch()}
        />
      ) : pins.length === 0 ? (
        <EmptyState
          title="Nothing pinned yet"
          description="Pin a trace to keep it here with its cause and your note."
          action={
            <Button variant="outline" asChild>
              <Link to="/traces">Go to traces</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {pins.map((pin) => (
            <li key={pin.traceId}>
              <PinCard pin={pin} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
