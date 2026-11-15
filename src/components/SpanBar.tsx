import {
  SERVICE_BACKGROUNDS,
  type ServiceColor,
} from '@/components/service-colors';
import { cn } from '@/lib/utils';

interface SpanBarProps {
  /** Where the bar starts on the timeline, from 0 to 1. */
  start: number;
  /** How much of the timeline the bar covers, from 0 to 1. */
  length: number;
  color: ServiceColor;
  className?: string;
}

/**
 * One span on a timeline. It is hidden from screen readers: the row it sits
 * in gives the same information as text. It is built from `span` elements so
 * it can sit inside a button.
 */
export function SpanBar({ start, length, color, className }: SpanBarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative block h-3 rounded-sm bg-muted', className)}
    >
      <span
        // The minimum width keeps a very short span visible.
        className={cn(
          'absolute inset-y-0 min-w-0.5 rounded-sm',
          SERVICE_BACKGROUNDS[color],
        )}
        style={{ left: `${start * 100}%`, width: `${length * 100}%` }}
      />
    </span>
  );
}
