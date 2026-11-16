import { Command } from 'cmdk';
import { CalendarClock, Check, ChevronsUpDown, Search } from 'lucide-react';
import { type FormEvent, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  findQuickRange,
  isBound,
  isOrdered,
  QUICK_RANGES,
  rangeCaption,
  type TimeRange,
} from '@/lib/time-range';
import { cn } from '@/lib/utils';

interface TimeRangePickerProps {
  id?: string;
  /** `null` is all time. */
  value: TimeRange | null;
  onChange: (range: TimeRange | null) => void;
  /** Where the panel opens. It moves if there is no room there. */
  side?: 'bottom' | 'right';
  /** Which edge of the button the panel lines up with. */
  align?: 'start' | 'end';
  className?: string;
}

interface Errors {
  from?: string;
  to?: string;
}

const ALL_TIME = 'All time';
const FORMAT_HINT = 'In UTC, as 2026-11-14 06:00, or now-2h.';

function validate(draft: TimeRange): Errors {
  const errors: Errors = {};
  for (const key of ['from', 'to'] as const) {
    const text = draft[key].trim();
    if (!text) {
      errors[key] = `Enter ${key === 'from' ? 'a start' : 'an end'}.`;
    } else if (!isBound(text)) {
      errors[key] = 'Not a time. Write it as 2026-11-14 06:00, or now-2h.';
    }
  }
  if (!errors.from && !errors.to && !isOrdered(draft)) {
    errors.to = 'The end must come after the start.';
  }
  return errors;
}

/**
 * Picks the time to look at: a quick range in one click, or any from and to.
 *
 * The button says what is picked ("Last 6 hours"). It opens a panel with a
 * searchable list of quick ranges, which apply at once, and a form for a
 * custom range, which applies with its button, so a half-typed time is never
 * sent. The form opens filled with the current range each time.
 */
export function TimeRangePicker({
  id,
  value,
  onChange,
  side = 'bottom',
  align = 'start',
  className,
}: TimeRangePickerProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimeRange>({ from: '', to: '' });
  const [errors, setErrors] = useState<Errors>({});
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const caption = rangeCaption(value);
  const currentLabel = value
    ? (findQuickRange(value)?.label ?? null)
    : ALL_TIME;

  function onOpenChange(next: boolean) {
    if (next) {
      setDraft(value ?? { from: '', to: '' });
      setErrors({});
    }
    setOpen(next);
  }

  function pick(range: TimeRange | null) {
    onChange(range);
    setOpen(false);
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (found.from) {
      fromRef.current?.focus();
    } else if (found.to) {
      toRef.current?.focus();
    } else {
      pick({ from: draft.from.trim(), to: draft.to.trim() });
    }
  }

  const field = (key: 'from' | 'to', label: string) => {
    const inputId = `${fieldId}-${key}`;
    const error = errors[key];
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-xs font-medium">
          {label}
        </label>
        <Input
          ref={key === 'from' ? fromRef : toRef}
          id={inputId}
          value={draft[key]}
          placeholder={key === 'from' ? 'now-1h' : 'now'}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          // The error first, so it is heard before the format reminder.
          aria-describedby={`${error ? `${inputId}-error ` : ''}${fieldId}-hint`}
          onChange={(event) =>
            setDraft({ ...draft, [key]: event.target.value })
          }
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`Time: ${caption}`}
          title={caption}
          className={cn(
            'flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-2 py-1 text-left text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
        >
          <CalendarClock
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          {/* A custom range wraps rather than hide its end. */}
          <span className="min-w-0 flex-1">{caption}</span>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Time range"
        side={side}
        align={align}
        className="flex max-h-(--radix-popover-content-available-height) w-[calc(100vw-1rem)] flex-col overflow-y-auto p-0 sm:w-auto sm:flex-row sm:overflow-visible"
      >
        <Command
          label="Quick ranges"
          defaultValue={currentLabel ?? undefined}
          className="flex shrink-0 flex-col sm:w-48"
        >
          <div className="flex items-center gap-2 border-b px-2.5">
            <Search
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <Command.Input
              placeholder="Search quick ranges"
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-48 overflow-y-auto p-1 sm:max-h-64">
            <Command.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matches
            </Command.Empty>
            {[
              { label: ALL_TIME, range: null },
              ...QUICK_RANGES.map((range) => ({ label: range.label, range })),
            ].map((item) => (
              <Command.Item
                key={item.label}
                value={item.label}
                onSelect={() =>
                  pick(
                    item.range && { from: item.range.from, to: item.range.to },
                  )
                }
                className="flex h-8 items-center gap-2 rounded-md px-2 text-sm select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.label === currentLabel && (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>

        <form
          aria-labelledby={`${fieldId}-title`}
          noValidate
          onSubmit={apply}
          className="flex flex-col gap-3 border-t p-4 sm:w-64 sm:border-t-0 sm:border-l"
        >
          <h2 id={`${fieldId}-title`} className="text-sm font-semibold">
            Custom range
          </h2>
          {field('from', 'From')}
          {field('to', 'To')}
          <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
            {FORMAT_HINT}
          </p>
          <Button type="submit" className="mt-auto">
            Apply time range
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
