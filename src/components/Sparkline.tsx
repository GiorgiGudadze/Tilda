import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Oldest first. A `null` is a gap in the line. */
  values: (number | null)[];
  /** The top of the line. The largest value when not given. */
  max?: number;
  className?: string;
}

/**
 * A small line of how a number went over time, drawn behind the number. It
 * has no axis and no labels: it shows the shape, and the number beside it
 * says the amount. It is decoration, so screen readers skip it.
 *
 * The drawing is in a 100 by 100 box that stretches to the element, with
 * the stroke kept at one width.
 */
export function Sparkline({ values, max, className }: SparklineProps) {
  const top = max ?? Math.max(...values.map((value) => value ?? 0), 0);
  const count = values.length;
  const x = (index: number) => (count <= 1 ? 50 : (index / (count - 1)) * 100);
  const y = (value: number) => (top <= 0 ? 100 : 100 - (value / top) * 100);

  // One run of points per stretch without gaps.
  const runs: string[] = [];
  let run: string[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (run.length) runs.push(run.join(' '));
      run = [];
    } else {
      run.push(`${x(index)},${y(value)}`);
    }
  });
  if (run.length) runs.push(run.join(' '));

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('size-full', className)}
    >
      {runs.map((points) => (
        <polyline
          key={points}
          points={points}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="stroke-muted-foreground/60"
        />
      ))}
    </svg>
  );
}
