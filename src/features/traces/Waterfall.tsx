import { formatDuration } from '@/lib/format';
import type { Span } from '@/features/traces/schemas';
import { flattenSpans } from '@/features/traces/span-tree';

interface WaterfallProps {
  spans: Span[];
  /** Duration of the whole trace. Every bar is drawn against it. */
  totalMs: number;
}

/** Every span as one row: its name, a bar on the trace's timeline, its duration. */
export function Waterfall({ spans, totalMs }: WaterfallProps) {
  const rows = flattenSpans(spans);
  // A trace of 0 ms would divide by zero.
  const scale = 100 / Math.max(totalMs, 1);

  return (
    <ol aria-label="Spans" className="divide-y rounded-md border text-sm">
      {rows.map(({ span, depth }) => (
        <li
          key={span.id}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_7rem] items-center gap-3 px-3 py-1.5"
        >
          <div className="truncate" style={{ paddingLeft: `${depth}rem` }}>
            <span className="font-medium">{span.service}</span>{' '}
            <span className="text-muted-foreground">{span.operation}</span>
          </div>
          <div className="relative h-3 rounded-sm bg-muted" aria-hidden="true">
            <div
              className="absolute inset-y-0 min-w-0.5 rounded-sm bg-primary"
              style={{
                left: `${span.startMs * scale}%`,
                width: `${span.durationMs * scale}%`,
              }}
            />
          </div>
          <div className="text-right tabular-nums">
            {formatDuration(span.durationMs)}
            {span.status === 'error' && ', failed'}
          </div>
        </li>
      ))}
    </ol>
  );
}
