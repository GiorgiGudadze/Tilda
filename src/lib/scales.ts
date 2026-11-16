/**
 * Positions on a chart, as a share of its height or width from 0 to 1.
 * They are pure functions, so the chart only draws and these get the tests.
 */

/** The fixed duration axis: 10 ms at the bottom, 10 s at the top. */
const DURATION_AXIS = { minMs: 10, maxMs: 10_000 };

/** The duration axis is labelled at every power of ten. */
export const DURATION_TICKS = [
  { ms: 10, label: '10 ms' },
  { ms: 100, label: '100 ms' },
  { ms: 1000, label: '1 s' },
  { ms: 10_000, label: '10 s' },
];

/**
 * Where a duration sits on the log axis: 0 at the bottom, 1 at the top.
 * A log axis gives 10 ms to 100 ms as much room as 1 s to 10 s, so the many
 * fast requests do not pile up at the bottom. Values outside the axis are
 * drawn at its edge.
 */
export function durationPosition(ms: number): number {
  const { minMs, maxMs } = DURATION_AXIS;
  const clamped = Math.min(Math.max(ms, minMs), maxMs);
  return Math.log10(clamped / minMs) / Math.log10(maxMs / minMs);
}

/** Where a time sits between `fromMs` (0) and `toMs` (1). */
export function timePosition(ms: number, fromMs: number, toMs: number): number {
  return toMs === fromMs ? 0.5 : (ms - fromMs) / (toMs - fromMs);
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Steps for time ticks. Each divides a day, so ticks land on round times. */
const TIME_STEPS = [1, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440].map(
  (minutes) => minutes * MINUTE,
);

// UTC, as everywhere else in the app.
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/**
 * Round times between `fromMs` and `toMs`, at most `maxTicks` of them, with
 * the smallest step that fits. Midnight is labelled with the date ("14 Nov"),
 * so a day boundary on the axis can be seen.
 */
export function timeTicks(
  fromMs: number,
  toMs: number,
  maxTicks = 5,
): { ms: number; label: string }[] {
  const span = toMs - fromMs;
  const step =
    TIME_STEPS.find((candidate) => span / candidate <= maxTicks) ?? DAY;
  const ticks = [];
  for (let ms = Math.ceil(fromMs / step) * step; ms <= toMs; ms += step) {
    ticks.push({
      ms,
      label:
        ms % DAY === 0
          ? dayFormat.format(new Date(ms))
          : timeFormat.format(new Date(ms)),
    });
  }
  return ticks;
}

/** Bar widths for the volume chart. Each divides a day, so bars start on round times. */
const VOLUME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440].map(
  (minutes) => minutes * MINUTE,
);

/**
 * The bar width for a time span: the smallest round step that gives at most
 * `maxBars` bars, so the chart never has more bars than it can draw.
 */
export function volumeStep(spanMs: number, maxBars: number): number {
  return (
    VOLUME_STEPS.find((step) => Math.ceil(spanMs / step) <= maxBars) ??
    Math.ceil(spanMs / maxBars / DAY) * DAY
  );
}

/**
 * The count axis: from 0 to a round top at or above `max`, in two to five
 * round steps (1, 2 or 5 times a power of ten). `[0, 1]` when there is nothing.
 */
export function countTicks(max: number): number[] {
  if (max <= 0) {
    return [0, 1];
  }
  const power = 10 ** Math.floor(Math.log10(max));
  const step =
    [0.1, 0.2, 0.5, 1, 2, 5, 10]
      .map((factor) => Math.max(1, factor * power))
      .find((candidate) => Math.ceil(max / candidate) <= 4) ?? max;
  const ticks = [];
  for (let tick = 0; tick < max + step; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

/**
 * A dragged span of time, widened to whole steps on both sides, so a zoom
 * shows whole bars. The order of the two ends does not matter, and a click
 * (both ends in one bar) gives that bar.
 */
export function snapToSteps(
  aMs: number,
  bMs: number,
  stepMs: number,
): { fromMs: number; toMs: number } {
  const fromMs = Math.floor(Math.min(aMs, bMs) / stepMs) * stepMs;
  const toMs = Math.max(
    fromMs + stepMs,
    Math.ceil(Math.max(aMs, bMs) / stepMs) * stepMs,
  );
  return { fromMs, toMs };
}
