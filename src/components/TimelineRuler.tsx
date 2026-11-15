import { cn } from '@/lib/utils';

interface TimelineRulerProps {
  /** Tick labels from the start of the timeline to its end, evenly spaced. */
  labels: string[];
  className?: string;
}

/**
 * The scale above a column of span bars. It is hidden from screen readers:
 * every row states its own duration as text.
 */
export function TimelineRuler({ labels, className }: TimelineRulerProps) {
  const last = labels.length - 1;
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative h-5 border-b border-input text-xs text-muted-foreground tabular-nums',
        className,
      )}
    >
      {labels.map((label, index) => (
        <span
          key={index}
          className={cn(
            'absolute top-0 whitespace-nowrap',
            // The first and last labels stay inside the ruler. The others
            // are centred on their tick.
            index === 0 && 'left-0',
            index === last && 'right-0',
            index > 0 && index < last && '-translate-x-1/2',
            // A narrow ruler has room for every second label only.
            index % 2 === 1 && 'hidden sm:block',
          )}
          style={
            index > 0 && index < last
              ? { left: `${(index / last) * 100}%` }
              : undefined
          }
        >
          {label}
        </span>
      ))}
    </div>
  );
}
