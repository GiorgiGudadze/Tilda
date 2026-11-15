import { cn } from '@/lib/utils';

interface DurationChartBar<Key extends string> {
  key: Key;
  /** Shown under the bar, as in "2 to 3 s". */
  label: string;
  count: number;
}

interface DurationChartProps<Key extends string> {
  bars: DurationChartBar<Key>[];
  selectedKey: Key | null;
  /** Called with the bar's key, or `null` when the selected bar is clicked. */
  onSelect: (key: Key | null) => void;
  className?: string;
}

/**
 * A small bar chart in which every bar is a button that filters by its range.
 * The count is written above each bar, so no value depends on the bar alone.
 *
 * Each button is named like "2 to 3 s, 14 traces". The name contains the
 * text that is visible on the button, so it can also be spoken to select it.
 */
export function DurationChart<Key extends string>({
  bars,
  selectedKey,
  onSelect,
  className,
}: DurationChartProps<Key>) {
  const max = Math.max(...bars.map((bar) => bar.count), 1);

  return (
    <fieldset className={cn('flex min-w-0 gap-0.5 sm:gap-1', className)}>
      <legend className="sr-only">
        Traces by duration. Select a range to filter.
      </legend>
      {bars.map((bar) => {
        const selected = bar.key === selectedKey;
        return (
          <button
            key={bar.key}
            type="button"
            aria-pressed={selected}
            // An empty range has nothing to show, unless it is the one to clear.
            disabled={bar.count === 0 && !selected}
            onClick={() => onSelect(selected ? null : bar.key)}
            className="group flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md border border-transparent px-0.5 py-1 text-xs sm:px-1 outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-input aria-pressed:bg-muted"
          >
            {/* The whole name in one piece, for screen readers and speech. */}
            <span className="sr-only">
              {`${bar.label}, ${bar.count} ${bar.count === 1 ? 'trace' : 'traces'}`}
            </span>
            <span
              aria-hidden="true"
              className="tabular-nums group-aria-pressed:font-semibold"
            >
              {bar.count}
            </span>
            <span
              aria-hidden="true"
              className="flex h-8 w-full max-w-16 items-end border-b border-input"
            >
              <span
                className="min-h-px w-full rounded-t-sm bg-muted-foreground group-aria-pressed:bg-primary"
                style={{ height: `${(bar.count / max) * 100}%` }}
              />
            </span>
            <span
              aria-hidden="true"
              // A little smaller on a phone, so a label takes two lines, not three.
              className="text-center text-[0.6875rem] leading-tight text-muted-foreground group-aria-pressed:font-semibold group-aria-pressed:text-foreground sm:text-xs"
            >
              {bar.label}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
