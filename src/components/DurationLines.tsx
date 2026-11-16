import { useState } from 'react';
import { ChartTooltip } from '@/components/ChartTooltip';
import { formatDuration, formatStep } from '@/lib/format';
import {
  DURATION_TICKS,
  durationPosition,
  timePosition,
  timeTicks,
} from '@/lib/scales';
import { formatSpan } from '@/lib/time-range';
import { cn } from '@/lib/utils';

interface DurationStep {
  startMs: number;
  /** `null` when nothing was measured in the step: a gap in the line. */
  medianMs: number | null;
  p95Ms: number | null;
}

interface DurationLinesProps {
  /** Oldest first, one per step, the empty ones included. */
  steps: DurationStep[];
  /** The width of one step. */
  stepMs: number;
  className?: string;
}

/** As a CSS percentage, for SVG attributes. */
const percent = (share: number) => `${share * 100}%`;

/**
 * Two lines over time on the log duration axis of the scatter plot: the
 * typical call (the median) and the slowest 5% (the 95th percentile). The
 * two differ by weight, not only by colour: the slowest line is the thick
 * dark one, the typical line the thin grey one, and the legend draws both
 * the same way.
 *
 * A step shows its two values in a tooltip while the pointer is on it.
 * The chart is for the mouse; screen readers get a summary.
 */
export function DurationLines({
  steps,
  stepMs,
  className,
}: DurationLinesProps) {
  const first = steps[0];
  const last = steps.at(-1);
  const fromMs = first?.startMs ?? 0;
  const toMs = (last?.startMs ?? 0) + stepMs;
  const [hovered, setHovered] = useState<DurationStep | null>(null);
  const measured = steps.filter((step) => step.medianMs !== null);

  if (!first || !last || measured.length === 0) {
    return (
      <p
        className={cn(
          'flex h-52 items-center justify-center rounded-lg border text-sm text-muted-foreground',
          className,
        )}
      >
        No calls in this time.
      </p>
    );
  }

  const x = (ms: number) => timePosition(ms, fromMs, toMs) * 100;
  const y = (ms: number) => (1 - durationPosition(ms)) * 100;
  const middle = (step: DurationStep) => step.startMs + stepMs / 2;

  /** The polylines of one series, broken where a step has no value. */
  const runsOf = (pick: (step: DurationStep) => number | null) => {
    const runs: string[] = [];
    let run: string[] = [];
    for (const step of steps) {
      const value = pick(step);
      if (value === null) {
        if (run.length) runs.push(run.join(' '));
        run = [];
      } else {
        run.push(`${x(middle(step))},${y(value)}`);
      }
    }
    if (run.length) runs.push(run.join(' '));
    return runs;
  };

  const slowest = Math.max(...measured.map((step) => step.p95Ms ?? 0));
  const slowestStep = measured.find((step) => step.p95Ms === slowest)!;

  return (
    <figure className={cn('space-y-2', className)}>
      <div className="h-52 pt-2 pr-3 pb-6 pl-12">
        <div
          className="relative size-full"
          onPointerLeave={() => setHovered(null)}
        >
          <svg
            aria-hidden="true"
            className="size-full overflow-visible text-[0.6875rem]"
          >
            {DURATION_TICKS.map((tick) => (
              <g key={tick.ms}>
                <line
                  x1="0"
                  x2="100%"
                  y1={percent(1 - durationPosition(tick.ms))}
                  y2={percent(1 - durationPosition(tick.ms))}
                  className="stroke-border"
                />
                <text
                  x="-8"
                  y={percent(1 - durationPosition(tick.ms))}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="fill-muted-foreground"
                >
                  {tick.label}
                </text>
              </g>
            ))}
            {timeTicks(fromMs, toMs).map((tick) => (
              <text
                key={tick.ms}
                x={percent(timePosition(tick.ms, fromMs, toMs))}
                y="100%"
                dy="1.4em"
                textAnchor="middle"
                className="fill-muted-foreground"
              >
                {tick.label}
              </text>
            ))}
          </svg>

          {/* The lines, in a box that stretches to the chart. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {runsOf((step) => step.medianMs).map((points) => (
              <polyline
                key={points}
                points={points}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="stroke-muted-foreground"
              />
            ))}
            {runsOf((step) => step.p95Ms).map((points) => (
              <polyline
                key={points}
                points={points}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="stroke-foreground"
              />
            ))}
          </svg>

          {/* One invisible column per step takes the pointer. */}
          <svg aria-hidden="true" className="absolute inset-0 size-full">
            {steps.map((step) => (
              <rect
                key={step.startMs}
                x={percent(timePosition(step.startMs, fromMs, toMs))}
                width={percent(stepMs / (toMs - fromMs))}
                height="100%"
                data-step=""
                className={cn(
                  'fill-transparent',
                  hovered === step && 'fill-muted-foreground/15',
                )}
                onPointerEnter={() => setHovered(step)}
              />
            ))}
          </svg>

          <ChartTooltip
            at={
              hovered
                ? {
                    left: percent(timePosition(middle(hovered), fromMs, toMs)),
                    top: percent(
                      1 -
                        durationPosition(
                          hovered.p95Ms ?? hovered.medianMs ?? 0,
                        ),
                    ),
                  }
                : null
            }
          >
            {hovered && (
              <div className="space-y-1">
                <p className="font-medium">
                  {formatSpan(hovered.startMs, hovered.startMs + stepMs)}
                </p>
                {hovered.medianMs === null ? (
                  <p>No calls</p>
                ) : (
                  <>
                    <p>{`Slowest 5%: ${formatDuration(hovered.p95Ms ?? 0)}`}</p>
                    <p>{`Typical: ${formatDuration(hovered.medianMs)}`}</p>
                  </>
                )}
              </div>
            )}
          </ChartTooltip>
        </div>
      </div>

      <figcaption className="text-xs text-muted-foreground">
        <span className="sr-only">
          {`Over ${formatSpan(fromMs, toMs)}, the slowest 5% of calls peaked at ${formatDuration(slowest)} in ${formatSpan(slowestStep.startMs, slowestStep.startMs + stepMs)}.`}
        </span>
        <span
          aria-hidden="true"
          className="flex flex-wrap items-center gap-x-4 gap-y-1"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-foreground" />
            Slowest 5%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-px w-4 bg-muted-foreground" />
            Typical (median)
          </span>
          <span>{`Each step is ${formatStep(stepMs)}.`}</span>
        </span>
      </figcaption>
    </figure>
  );
}
