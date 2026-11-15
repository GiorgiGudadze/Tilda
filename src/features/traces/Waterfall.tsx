import { ServiceLabel } from '@/components/ServiceLabel';
import { SpanBar } from '@/components/SpanBar';
import { StatusBadge } from '@/components/StatusBadge';
import type { Span } from '@/features/traces/schemas';
import { serviceColor } from '@/features/traces/service-colors';
import { flattenSpans } from '@/features/traces/span-tree';
import { formatDuration } from '@/lib/format';

interface WaterfallProps {
  spans: Span[];
  /** Duration of the whole trace. Every bar is drawn against it. */
  totalMs: number;
}

/** Every span as one row: its name, a bar on the trace's timeline, its duration. */
export function Waterfall({ spans, totalMs }: WaterfallProps) {
  const rows = flattenSpans(spans);
  // A trace of 0 ms would divide by zero.
  const total = Math.max(totalMs, 1);

  return (
    <ol aria-label="Spans" className="divide-y rounded-md border text-sm">
      {rows.map(({ span, depth }) => {
        const color = serviceColor(span.service);
        return (
          <li
            key={span.id}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_9rem] items-center gap-3 px-3 py-1.5"
          >
            <div className="truncate" style={{ paddingLeft: `${depth}rem` }}>
              <ServiceLabel name={span.service} color={color} />{' '}
              <span className="text-muted-foreground">{span.operation}</span>
            </div>
            <SpanBar
              start={span.startMs / total}
              length={span.durationMs / total}
              color={color}
            />
            <div className="flex items-center justify-end gap-2 tabular-nums">
              {span.status === 'error' && (
                <StatusBadge status="error" label="Failed" />
              )}
              {formatDuration(span.durationMs)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
