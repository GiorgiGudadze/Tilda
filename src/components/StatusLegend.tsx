import { X } from 'lucide-react';
import { StatusMark } from '@/components/StatusMark';
import { cn } from '@/lib/utils';

type Status = 'ok' | 'error';

const ITEMS: { value: Status; label: string }[] = [
  { value: 'ok', label: 'OK' },
  { value: 'error', label: 'Error' },
];

interface StatusLegendProps {
  /** The status shown alone, or `null` for both. */
  value: Status | null;
  onChange: (value: Status | null) => void;
  className?: string;
}

/**
 * The legend of the status marks, and the status filter. Each entry is a
 * button: pressing one shows only that status, pressing it again shows both.
 *
 * It looks like something to press: a bordered pill that reacts to the
 * pointer, a "Status" label in front. The one that is on is filled in the
 * primary colour (black in the light theme) with a ×. The
 * status that is filtered away is greyed out, mark and text, so the legend
 * never shows a colour that is not on the plot.
 */
export function StatusLegend({
  value,
  onChange,
  className,
}: StatusLegendProps) {
  return (
    <fieldset
      className={cn('flex flex-wrap items-center gap-1.5 text-xs', className)}
    >
      <legend className="sr-only">Status</legend>
      <span
        aria-hidden="true"
        className="mr-0.5 font-medium text-muted-foreground"
      >
        Status
      </span>
      {ITEMS.map((item) => {
        const selected = value === item.value;
        const filteredAway = value !== null && !selected;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            title={
              selected ? 'Show all statuses' : `Show only ${item.label} traces`
            }
            onClick={() => onChange(selected ? null : item.value)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-input bg-background px-2.5 font-medium outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/85',
              filteredAway && 'text-muted-foreground',
            )}
          >
            <StatusMark
              failed={item.value === 'error'}
              tone={selected ? 'on-primary' : filteredAway ? 'muted' : 'plot'}
            />
            {item.label}
            {selected && <X aria-hidden="true" className="-mr-0.5 size-3" />}
          </button>
        );
      })}
    </fieldset>
  );
}
