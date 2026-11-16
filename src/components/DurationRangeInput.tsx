import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Whole milliseconds. `null` leaves that end of the range open. */
export interface MillisecondRange {
  minMs: number | null;
  maxMs: number | null;
}

interface DurationRangeInputProps {
  /** The group's name, shown above it, as "Duration". */
  label: string;
  value: MillisecondRange;
  onChange: (value: MillisecondRange) => void;
  className?: string;
}

/** Seven digits is close to three hours, far past any request. */
const MAX_DIGITS = 7;

/**
 * Keeps only the digits of what was typed. An empty field is an open end.
 *
 * This is a text field, not `type="number"`: a number field reports an
 * empty value while its text is half typed ("1e"), which would clear what
 * the user is typing. `inputMode="numeric"` still brings up the number pad
 * on a phone.
 */
function parseMs(text: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
  return digits === '' ? null : Number(digits);
}

/**
 * A duration range as two fields side by side, min and max, in
 * milliseconds. Both ends are included. A max below the min is pointed out
 * under the fields, because nothing can match it.
 */
export function DurationRangeInput({
  label,
  value,
  onChange,
  className,
}: DurationRangeInputProps) {
  const minId = useId();
  const maxId = useId();
  const errorId = useId();
  const { minMs, maxMs } = value;
  const invalid = minMs !== null && maxMs !== null && maxMs < minMs;

  function field(end: 'min' | 'max') {
    const id = end === 'min' ? minId : maxId;
    const current = end === 'min' ? minMs : maxMs;
    // The error is about the max: it is the field to fix.
    const showError = invalid && end === 'max';
    const visible = end === 'min' ? 'Min' : 'Max';
    return (
      <div className="min-w-0 space-y-1">
        <label htmlFor={id} className="block text-xs text-muted-foreground">
          {visible}
        </label>
        <div className="relative">
          <Input
            id={id}
            // The full name, set here so it is read in one piece. It starts
            // with the word on screen, so it can also be said to pick it.
            aria-label={`${visible} duration, in milliseconds`}
            inputMode="numeric"
            autoComplete="off"
            placeholder={end === 'min' ? '0' : 'Any'}
            value={current === null ? '' : String(current)}
            onChange={(event) =>
              onChange({ ...value, [`${end}Ms`]: parseMs(event.target.value) })
            }
            aria-invalid={showError}
            aria-describedby={showError ? errorId : undefined}
            className="pr-8 tabular-nums"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground"
          >
            ms
          </span>
        </div>
      </div>
    );
  }

  return (
    <fieldset className={cn('min-w-0 space-y-1.5', className)}>
      <legend className="mb-1 px-2 text-xs font-medium text-muted-foreground">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2 px-2">
        {field('min')}
        {field('max')}
      </div>
      {invalid && (
        <p id={errorId} className="px-2 text-xs font-medium text-destructive">
          The max is below the min, so nothing can match.
        </p>
      )}
    </fieldset>
  );
}
