import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/** A short explanation of traces for someone who has not used them before. */
export function TracesHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleHelp aria-hidden="true" />
          New to traces?
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="What a trace is"
        className="space-y-2"
      >
        <p className="font-medium">Think of a parcel</p>
        <p>
          A <strong>trace</strong> is the tracking history of one request, the
          way a parcel has a tracking history.
        </p>
        <p>
          Each <strong>span</strong> is one stop on the way: a service that
          handled the request, or a query it ran.
        </p>
        <p>
          This app points at the stop where the parcel sat the longest, or where
          it was lost.
        </p>
      </PopoverContent>
    </Popover>
  );
}
