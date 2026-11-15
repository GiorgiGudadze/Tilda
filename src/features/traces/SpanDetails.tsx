import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import type { Span } from '@/features/traces/schemas';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SpanDetailsProps {
  /** The row's button points at this id with `aria-controls`. */
  id: string;
  span: Span;
  /** The span's own time, without the time of its children. */
  selfMs: number;
  /** Duration of the whole trace. */
  totalMs: number;
  /** `undefined` for the root span. */
  parent: Span | undefined;
  childCount: number;
  isSlowest: boolean;
  onSelectSpan: (id: string) => void;
}

function Item({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

/** Everything about one span. It opens under the span's row. */
export function SpanDetails({
  id,
  span,
  selfMs,
  totalMs,
  parent,
  childCount,
  isSlowest,
  onSelectSpan,
}: SpanDetailsProps) {
  const share = Math.round((selfMs / Math.max(totalMs, 1)) * 100);

  return (
    <div id={id} className="space-y-3 border-t bg-muted px-3 py-3">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {/* The row can cut a long operation short. Here it is in full. */}
        <Item label="Operation" className="col-span-full">
          {span.service}: {span.operation}
        </Item>
        <Item label="Status">
          <StatusBadge
            status={span.status}
            label={span.status === 'error' ? 'Failed' : 'OK'}
          />
        </Item>
        <Item label="Duration">
          <span className="tabular-nums">
            {formatDuration(span.durationMs)}
          </span>
        </Item>
        <Item label="Self time">
          <span className="tabular-nums">
            {formatDuration(selfMs)}, {share}% of the trace
          </span>
        </Item>
        <Item label="Starts at">
          <span className="tabular-nums">{formatDuration(span.startMs)}</span>
        </Item>
        <Item label="Parent span" className="col-span-2">
          {parent ? (
            <button
              type="button"
              className="rounded-sm text-left underline underline-offset-4"
              onClick={() => onSelectSpan(parent.id)}
            >
              {parent.service}: {parent.operation}
            </button>
          ) : (
            'None. This is the first span of the trace.'
          )}
        </Item>
        <Item label="Child spans">
          <span className="tabular-nums">{childCount}</span>
        </Item>
        <Item label="Span ID">
          <span className="font-mono">{span.id}</span>
        </Item>
      </dl>
      <p className="text-muted-foreground">
        Self time is the time this span worked itself, without waiting for its
        child spans.
        {isSlowest && ' This span has the largest self time in the trace.'}
      </p>
    </div>
  );
}
