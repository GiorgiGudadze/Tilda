import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<Value extends string> {
  /** Names the group for screen readers, as in "Chart". */
  label: string;
  value: Value;
  options: SegmentedControlOption<Value>[];
  onChange: (value: Value) => void;
  className?: string;
}

/**
 * A few buttons side by side, one of them chosen. Each is a toggle button
 * (`aria-pressed`), so a screen reader says which one is on. The chosen one
 * has a background and bold text, not only a different colour.
 */
export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<Value>) {
  return (
    <fieldset
      className={cn(
        'inline-flex gap-0.5 rounded-lg border border-input bg-background p-0.5',
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={optionValue === value}
          onClick={() => onChange(optionValue)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-muted aria-pressed:font-semibold aria-pressed:text-foreground"
        >
          {Icon && <Icon aria-hidden="true" className="size-4" />}
          {optionLabel}
        </button>
      ))}
    </fieldset>
  );
}
