import { cn } from '@/lib/utils';

interface DurationBarProps {
  value: number;
  /** The value that fills the whole bar. */
  max: number;
  className?: string;
}

/**
 * A small bar that compares one duration with the longest one beside it.
 * It is hidden from screen readers: the duration is always next to it as text.
 */
export function DurationBar({ value, max, className }: DurationBarProps) {
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div
      aria-hidden="true"
      className={cn('h-1.5 rounded-full bg-muted', className)}
    >
      <div
        className="h-full min-w-0.5 rounded-full bg-muted-foreground"
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
