import { useState } from 'react';
import { Link } from 'react-router';
import { ChartTooltip } from '@/components/ChartTooltip';
import { Mark, StatusMark } from '@/components/StatusMark';
import { formatDateTime, formatDuration } from '@/lib/format';
import {
  DURATION_TICKS,
  durationPosition,
  timePosition,
  snapToSteps,
  timeTicks,
} from '@/lib/scales';
import { useDragSpan } from '@/lib/use-drag-span';
import { cn } from '@/lib/utils';

interface ScatterPoint {
  id: string;
  timeMs: number;
  durationMs: number;
  failed: boolean;
  /** The request's name, as "POST /checkout", for the tooltip. */
  name: string;
  /** Where a click on the dot goes. */
  href: string;
}

interface DurationScatterProps {
  points: ScatterPoint[];
  /** A duration range to shade, as the selected bar of the bar chart. */
  band?: { minMs: number; maxMs: number } | null;
  /**
   * Called with a span of time, to the minute, when the pointer is dragged
   * across the plot. Without it, the plot takes no drags.
   */
  onZoom?: (range: { fromMs: number; toMs: number }) => void;
  className?: string;
}

const MINUTE = 60_000;

/** As a CSS percentage, for SVG attributes. 0 is the top or the left. */
const percent = (share: number) => `${share * 100}%`;
const fromTop = (ms: number) => percent(1 - durationPosition(ms));

/**
 * One mark per trace: time along the bottom, duration up the side on a log
 * scale. An OK trace is a small black dot and a failed one a bigger red
 * dot with a ring, so they differ in size, not only in colour. The legend
 * is `StatusLegend`, outside the plot, where it also filters.
 *
 * Positions are percentages, so the plot fills any width without measuring
 * it. Each dot sits in its own small SVG placed at its position, which keeps
 * circles round at every width.
 *
 * A mark shows its trace in a tooltip and opens it on a click. Dragging
 * across the plot zooms the time to the span; a plain click still reaches
 * the mark under it.
 *
 * The plot is for the mouse. It is hidden from screen readers, which get a
 * summary instead, and its dots are not in the tab order: 500 tab stops
 * would be useless. The table below lists the same traces for the keyboard.
 */
export function DurationScatter({
  points,
  band,
  onZoom,
  className,
}: DurationScatterProps) {
  const times = points.map((point) => point.timeMs);
  const first = Math.min(...times);
  const last = Math.max(...times);
  // A little room at both ends, so no dot sits on the edge.
  const pad = Math.max((last - first) * 0.02, MINUTE);
  const from = first - pad;
  const to = last + pad;

  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const { ref, span, handlers } = useDragSpan({
    clickSelects: false,
    onSpan: onZoom
      ? (startShare, endShare) => {
          const at = (share: number) => from + share * (to - from);
          onZoom(snapToSteps(at(startShare), at(endShare), MINUTE));
        }
      : undefined,
  });

  if (points.length === 0) {
    return (
      <p
        className={cn(
          'flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground sm:h-52',
          className,
        )}
      >
        No traces to plot.
      </p>
    );
  }

  const x = (ms: number) => percent(timePosition(ms, from, to));

  // Failures are drawn last, so one is never hidden under an OK dot.
  const ordered = [...points].sort(
    (a, b) => Number(a.failed) - Number(b.failed),
  );
  const failed = points.filter((point) => point.failed).length;
  const slowest = Math.max(...points.map((point) => point.durationMs));

  return (
    <figure className={cn('space-y-2', className)}>
      <div className="h-64 pt-2 pr-3 pb-6 pl-14 sm:h-52">
        <div
          ref={ref}
          className={cn(
            'relative size-full select-none',
            // Up and down still scroll the page on a touch screen.
            onZoom && 'cursor-crosshair touch-pan-y',
          )}
          {...handlers}
          onPointerLeave={() => setHovered(null)}
        >
          <svg
            aria-hidden="true"
            className="size-full overflow-visible text-[0.6875rem]"
          >
            {band && (
              <rect
                x="0"
                width="100%"
                y={fromTop(band.maxMs)}
                height={percent(
                  durationPosition(band.maxMs) - durationPosition(band.minMs),
                )}
                className="fill-muted"
              />
            )}

            {DURATION_TICKS.map((tick) => (
              <g key={tick.ms}>
                <line
                  x1="0"
                  x2="100%"
                  y1={fromTop(tick.ms)}
                  y2={fromTop(tick.ms)}
                  className="stroke-border"
                />
                <text
                  x="-8"
                  y={fromTop(tick.ms)}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="fill-muted-foreground"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {timeTicks(from, to).map((tick) => (
              <text
                key={tick.ms}
                x={x(tick.ms)}
                y="100%"
                dy="1.4em"
                textAnchor="middle"
                className="fill-muted-foreground"
              >
                {tick.label}
              </text>
            ))}

            {ordered.map((point) => (
              <Link
                key={point.id}
                to={point.href}
                tabIndex={-1}
                draggable={false}
                className="group cursor-pointer"
                onPointerEnter={() => setHovered(point)}
                onPointerLeave={() => setHovered(null)}
              >
                <svg
                  x={x(point.timeMs)}
                  y={fromTop(point.durationMs)}
                  overflow="visible"
                >
                  {/* A bigger, invisible circle makes the dot easier to hit. */}
                  <circle r="7" className="fill-transparent" />
                  <Mark failed={point.failed} />
                </svg>
              </Link>
            ))}
          </svg>

          {span && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 border-x border-primary bg-primary/10"
              style={{
                left: percent(Math.min(span.startShare, span.endShare)),
                width: percent(Math.abs(span.endShare - span.startShare)),
              }}
            />
          )}

          <ChartTooltip
            at={
              hovered && !span
                ? { left: x(hovered.timeMs), top: fromTop(hovered.durationMs) }
                : null
            }
          >
            {hovered && (
              <div className="space-y-1">
                <p className="font-medium">{hovered.name}</p>
                <p className="flex items-center gap-1.5">
                  <StatusMark failed={hovered.failed} tone="on-primary" />
                  {`${formatDuration(hovered.durationMs)}, ${hovered.failed ? 'Error' : 'OK'}`}
                </p>
                <p>{formatDateTime(new Date(hovered.timeMs).toISOString())}</p>
                <p className="opacity-70">Click to open</p>
              </div>
            )}
          </ChartTooltip>
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="sr-only">
          {`${points.length} ${points.length === 1 ? 'trace' : 'traces'} from ${formatDateTime(new Date(first).toISOString())} to ${formatDateTime(new Date(last).toISOString())}. ${failed} failed. The slowest took ${formatDuration(slowest)}.`}
        </span>
        <span aria-hidden="true">
          Each mark is one trace. Click one to open it
          {onZoom
            ? ", or drag across the plot to zoom in. The browser's Back button zooms out again."
            : '.'}
        </span>
      </figcaption>
    </figure>
  );
}
