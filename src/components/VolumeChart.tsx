import { useState } from 'react';
import { ChartTooltip } from '@/components/ChartTooltip';
import { StatusMark } from '@/components/StatusMark';
import { countTicks, snapToSteps, timePosition, timeTicks } from '@/lib/scales';
import { formatStep } from '@/lib/format';
import { formatSpan } from '@/lib/time-range';
import { useDragSpan } from '@/lib/use-drag-span';
import { cn } from '@/lib/utils';

export interface VolumeBar {
  startMs: number;
  ok: number;
  error: number;
}

interface VolumeChartProps {
  /** Oldest first, one per step, the empty ones included. */
  bars: VolumeBar[];
  /** The width of one bar. */
  stepMs: number;
  /**
   * Called with a span of whole bars when one is clicked or several are
   * dragged across. Without it, the chart only shows.
   */
  onZoom?: (range: { fromMs: number; toMs: number }) => void;
  className?: string;
}

/** As a CSS percentage, for SVG attributes. */
const percent = (share: number) => `${share * 100}%`;

/**
 * How many traces started in each step of time, as stacked bars: the failed
 * ones at the bottom, in red, the OK ones above them. Errors sit on the
 * common baseline, so they can be compared from bar to bar, and they differ
 * from OK by place as well as by colour.
 *
 * A bar shows its counts in a tooltip while the pointer is on it. Dragging across bars, or clicking
 * one, zooms the time to them. Positions are percentages, as in the scatter
 * plot, so the chart fills any width; only a drag measures it, to turn the
 * pointer into a time.
 *
 * The chart is for the mouse. Screen readers get a summary, and the time
 * range picker does the same zoom from the keyboard.
 */
export function VolumeChart({
  bars,
  stepMs,
  onZoom,
  className,
}: VolumeChartProps) {
  const total = bars.reduce((sum, bar) => sum + bar.ok + bar.error, 0);
  const first = bars[0];
  const last = bars.at(-1);
  const fromMs = first?.startMs ?? 0;
  const toMs = (last?.startMs ?? 0) + stepMs;
  const [hovered, setHovered] = useState<VolumeBar | null>(null);
  const { ref, span, handlers } = useDragSpan({
    clickSelects: true,
    onSpan: onZoom
      ? (startShare, endShare) => {
          const at = (share: number) => fromMs + share * (toMs - fromMs);
          const range = snapToSteps(at(startShare), at(endShare), stepMs);
          onZoom({
            fromMs: Math.max(range.fromMs, fromMs),
            toMs: Math.min(range.toMs, toMs),
          });
        }
      : undefined,
  });

  if (!first || !last || total === 0) {
    return (
      <p
        className={cn(
          'flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground sm:h-52',
          className,
        )}
      >
        No traces in this time.
      </p>
    );
  }

  const x = (ms: number) => percent(timePosition(ms, fromMs, toMs));
  const ticks = countTicks(Math.max(...bars.map((bar) => bar.ok + bar.error)));
  const top = ticks.at(-1)!;
  const height = (count: number) => percent(count / top);
  const fromTop = (count: number) => percent(1 - count / top);

  const failed = bars.reduce((sum, bar) => sum + bar.error, 0);
  const busiest = bars.reduce((most, bar) =>
    bar.ok + bar.error > most.ok + most.error ? bar : most,
  );

  return (
    <figure className={cn('space-y-2', className)}>
      <div className="h-64 pt-2 pr-3 pb-6 pl-10 sm:h-52">
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
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1="0"
                  x2="100%"
                  y1={fromTop(tick)}
                  y2={fromTop(tick)}
                  className="stroke-border"
                />
                <text
                  x="-8"
                  y={fromTop(tick)}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="fill-muted-foreground"
                >
                  {tick}
                </text>
              </g>
            ))}

            {timeTicks(fromMs, toMs).map((tick) => (
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

            {bars.map((bar) => (
              <svg
                key={bar.startMs}
                x={x(bar.startMs)}
                width={percent(stepMs / (toMs - fromMs))}
                className="overflow-visible"
              >
                {bar.error > 0 && (
                  <rect
                    x="10%"
                    width="80%"
                    y={fromTop(bar.error)}
                    height={height(bar.error)}
                    className="fill-destructive"
                  />
                )}
                {bar.ok > 0 && (
                  <rect
                    x="10%"
                    width="80%"
                    y={fromTop(bar.error + bar.ok)}
                    height={height(bar.ok)}
                    // A thin line in the page colour parts it from the red.
                    strokeWidth="1"
                    className="fill-foreground stroke-background"
                  />
                )}
                {hovered === bar && (
                  <rect
                    x="10%"
                    width="80%"
                    y={fromTop(bar.ok + bar.error)}
                    height={height(bar.ok + bar.error)}
                    strokeWidth="2"
                    className="pointer-events-none fill-none stroke-ring"
                  />
                )}
                {bar.ok + bar.error > 0 && (
                  <rect
                    x="10%"
                    width="80%"
                    y={fromTop(bar.ok + bar.error)}
                    height={height(bar.ok + bar.error)}
                    // Only the bar answers the pointer, not the empty space
                    // above it. The wide, invisible edge adds a few pixels
                    // around it, so a bar of one trace is still easy to hit.
                    strokeWidth="8"
                    data-bar=""
                    className="fill-transparent stroke-transparent"
                    onPointerEnter={() => setHovered(bar)}
                    onPointerLeave={() =>
                      setHovered((current) =>
                        current === bar ? null : current,
                      )
                    }
                  />
                )}
              </svg>
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
                ? {
                    left: x(hovered.startMs + stepMs / 2),
                    top: fromTop(hovered.ok + hovered.error),
                  }
                : null
            }
          >
            {hovered && (
              <div className="space-y-1">
                <p className="font-medium">
                  {formatSpan(hovered.startMs, hovered.startMs + stepMs)}
                </p>
                <p className="flex items-center gap-1.5">
                  <StatusMark failed={false} tone="on-primary" />
                  {`${hovered.ok} OK`}
                </p>
                <p className="flex items-center gap-1.5">
                  <StatusMark failed tone="on-primary" />
                  {`${hovered.error} failed`}
                </p>
                {onZoom && <p className="opacity-70">Click to zoom in</p>}
              </div>
            )}
          </ChartTooltip>
        </div>
      </div>

      <figcaption className="text-xs text-muted-foreground">
        <span className="sr-only">
          {`${total} ${total === 1 ? 'trace' : 'traces'} from ${formatSpan(fromMs, toMs)}, in steps of ${formatStep(stepMs)}. ${failed} failed. The busiest step, ${formatSpan(busiest.startMs, busiest.startMs + stepMs)}, had ${busiest.ok + busiest.error}.`}
        </span>
        <span aria-hidden="true">
          {`Each bar is ${formatStep(stepMs)}.`}
          {onZoom &&
            " Click a bar, or drag across several, to zoom in. The browser's Back button zooms out again."}
        </span>
      </figcaption>
    </figure>
  );
}
