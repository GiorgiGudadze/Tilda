import { PinOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUnpin } from '@/features/investigation/hooks';
import type { Pin } from '@/features/investigation/schemas';

/** What the user would lose, as the end of "This deletes …". */
function whatIsLost(pin: Pin): string | null {
  const hasNote = pin.note !== '';
  const hasDecision = pin.decision !== null;
  if (hasNote && hasDecision) return 'its note and its recorded cause';
  if (hasNote) return 'its note';
  if (hasDecision) return 'its recorded cause';
  return null;
}

/**
 * Unpins a trace. It asks first when there is something to lose: a note or
 * a decision. An empty pin is removed straight away.
 */
export function UnpinButton({ pin }: { pin: Pin }) {
  const unpin = useUnpin();
  const lost = whatIsLost(pin);

  // Several Unpin buttons can be on one page, so each names its trace.
  const name = `Unpin ${pin.trace.operation}`;
  const label = (
    <>
      <PinOff aria-hidden="true" />
      Unpin
    </>
  );

  if (lost === null) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label={name}
        onClick={() => unpin.mutate(pin.traceId)}
      >
        {label}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={name}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Unpin {pin.trace.operation}?</AlertDialogTitle>
        <AlertDialogDescription>
          This deletes {lost}. It cannot be undone.
        </AlertDialogDescription>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <AlertDialogCancel asChild>
            <Button variant="outline">Keep it pinned</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() => unpin.mutate(pin.traceId)}
            >
              Unpin and delete
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
