import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** How long the tick and "Copied" stay after a copy, in ms. */
const COPIED_FOR_MS = 1500;

interface TraceIdProps {
  id: string;
  className?: string;
}

type CopyResult = 'copied' | 'failed' | null;

/**
 * A trace ID cut short to fit a table column. Pointing at it, or tabbing to
 * its copy button, shows the whole ID on top of the row, with a button that
 * copies it.
 *
 * The whole ID is always in the page, only clipped, so a screen reader reads
 * all of it. The full copy shown on hover is for the eyes only.
 *
 * It sits above a row's stretched link: a click on the ID selects its text
 * instead of opening the trace, so it can also be copied by hand.
 */
export function TraceId({ id, className }: TraceIdProps) {
  const [result, setResult] = useState<CopyResult>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    if (!result) {
      return;
    }
    const timer = window.setTimeout(() => setResult(null), COPIED_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  function copy() {
    // Without a secure page, or with the permission refused, there is no
    // clipboard. The button then says so rather than doing nothing.
    const write = navigator.clipboard?.writeText(id);
    if (!write) {
      setResult('failed');
      return;
    }
    write.then(
      () => setResult('copied'),
      () => setResult('failed'),
    );
  }

  return (
    <span
      className={cn(
        'group/id relative z-10 block w-[10ch] font-mono text-xs',
        className,
      )}
    >
      <span className="block truncate group-focus-within/id:opacity-0 group-hover/id:opacity-0">
        {id}
      </span>

      <span className="pointer-events-none absolute -inset-y-1 -left-1 flex items-center gap-1 rounded-sm bg-background pr-0.5 pl-1 whitespace-nowrap opacity-0 shadow-sm ring-1 ring-border group-focus-within/id:pointer-events-auto group-focus-within/id:opacity-100 group-hover/id:pointer-events-auto group-hover/id:opacity-100">
        <span aria-hidden="true">{id}</span>
        <Tooltip
          open={tooltipOpen || result !== null}
          onOpenChange={setTooltipOpen}
        >
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Copy trace ID"
              // The tooltip would close on a press. It stays, to say "Copied".
              onPointerDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                copy();
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {result === 'copied' ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent inline side="top" className="font-sans">
            {result === 'copied'
              ? 'Copied'
              : result === 'failed'
                ? 'Could not copy. Select the ID instead.'
                : 'Copy trace ID'}
          </TooltipContent>
        </Tooltip>
      </span>

      <span aria-live="polite" className="sr-only">
        {result === 'copied'
          ? 'Trace ID copied'
          : result === 'failed'
            ? 'Could not copy the trace ID'
            : ''}
      </span>
    </span>
  );
}
