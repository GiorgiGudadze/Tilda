/**
 * A time range as two bounds, each written as text, so a link can say
 * "the last 6 hours" and still mean that tomorrow.
 *
 * A bound is one of:
 * - `now`, or `now-15m` / `now-6h` / `now-7d`: relative to the server's clock;
 * - `2026-11-14 06:00` (seconds optional): a moment in UTC, as the app shows times.
 *
 * The client never turns a relative bound into a time. The server does, with
 * its own clock, so a page left open does not drift from the data.
 */
export interface TimeRange {
  from: string;
  to: string;
}

const RELATIVE = /^now(?:-(\d{1,4})([mhd]))?$/;
const ABSOLUTE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** The bound as milliseconds, or `null` when it is not a bound. */
export function resolveBound(bound: string, nowMs: number): number | null {
  const text = bound.trim();

  const relative = RELATIVE.exec(text);
  if (relative) {
    const [, amount, unit] = relative;
    return amount && unit
      ? nowMs - Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS]
      : nowMs;
  }

  const absolute = ABSOLUTE.exec(text);
  if (absolute) {
    const [year, month, day, hour, minute, second = 0] = absolute
      .slice(1)
      .map((part) => (part === undefined ? undefined : Number(part)));
    const ms = Date.UTC(year!, month! - 1, day!, hour!, minute!, second);
    // Date.UTC rolls "2026-02-30" over to March. A real date reads back the same.
    const date = new Date(ms);
    const real =
      date.getUTCMonth() === month! - 1 &&
      date.getUTCDate() === day &&
      hour! < 24 &&
      minute! < 60 &&
      second < 60;
    return real ? ms : null;
  }

  return null;
}

export function isBound(bound: string): boolean {
  return resolveBound(bound, 0) !== null;
}

function isRelative(bound: string): boolean {
  return RELATIVE.test(bound.trim());
}

/**
 * Whether `from` comes before `to`. When one is relative and the other is
 * not, only the server's clock can tell, so it is allowed here: a range the
 * wrong way round simply matches nothing.
 */
export function isOrdered(range: TimeRange): boolean {
  if (isRelative(range.from) !== isRelative(range.to)) {
    return true;
  }
  const from = resolveBound(range.from, 0);
  const to = resolveBound(range.to, 0);
  return from !== null && to !== null && from < to;
}

/**
 * Whether `ms` falls in the range. The start is included and the end is not,
 * so ranges that meet, like two bars of a chart, never share a trace.
 */
export function inRange(ms: number, range: TimeRange, nowMs: number): boolean {
  const from = resolveBound(range.from, nowMs);
  const to = resolveBound(range.to, nowMs);
  return from !== null && to !== null && ms >= from && ms < to;
}

interface QuickRange extends TimeRange {
  label: string;
}

/** The ranges one click away, shortest first. */
export const QUICK_RANGES: QuickRange[] = (
  [
    ['5m', '5 minutes'],
    ['15m', '15 minutes'],
    ['30m', '30 minutes'],
    ['1h', 'hour'],
    ['3h', '3 hours'],
    ['6h', '6 hours'],
    ['12h', '12 hours'],
    ['24h', '24 hours'],
    ['7d', '7 days'],
  ] as const
).map(([span, words]) => ({
  label: `Last ${words}`,
  from: `now-${span}`,
  to: 'now',
}));

/** The quick range with exactly these bounds, if there is one. */
export function findQuickRange(range: TimeRange): QuickRange | undefined {
  return QUICK_RANGES.find(
    (quick) => quick.from === range.from.trim() && quick.to === range.to.trim(),
  );
}

const shortFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const DAY_MS = 86_400_000;

/**
 * What the range button says: "Last 6 hours", or "14 Nov, 06:00 to 08:00
 * UTC" for times, with the date said once when both are on the same day.
 * Relative bounds are kept as written.
 */
export function rangeCaption(range: TimeRange | null): string {
  if (!range) {
    return 'All time';
  }
  const quick = findQuickRange(range);
  if (quick) {
    return quick.label;
  }
  const show = (bound: string) =>
    isRelative(bound)
      ? bound.trim()
      : shortFormat.format(resolveBound(bound, 0)!);
  if (isRelative(range.from) && isRelative(range.to)) {
    return `${show(range.from)} to ${show(range.to)}`;
  }
  if (!isRelative(range.from) && !isRelative(range.to)) {
    return formatSpan(resolveBound(range.from, 0)!, resolveBound(range.to, 0)!);
  }
  return `${show(range.from)} to ${show(range.to)} UTC`;
}

/**
 * A span of time in UTC: "14 Nov, 06:00 to 08:00 UTC", with the date said
 * once when both ends are on the same day.
 */
export function formatSpan(fromMs: number, toMs: number): string {
  const sameDay = Math.floor(fromMs / DAY_MS) === Math.floor(toMs / DAY_MS);
  const end = sameDay ? timeFormat.format(toMs) : shortFormat.format(toMs);
  return `${shortFormat.format(fromMs)} to ${end} UTC`;
}

/** A moment as a bound, to the minute: "2026-11-14 06:00", in UTC. */
export function toBound(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
}
