/** "640 ms" below one second, "2.84 s" from one second up. */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

// UTC, so the seeded data reads the same for every viewer.
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
});

/** "14 Nov, 11:58:00 UTC" */
export function formatDateTime(iso: string): string {
  return `${dateTimeFormat.format(new Date(iso))} UTC`;
}

/**
 * A part of a whole as a whole number of percent: "78%". It rounds down, so
 * a share just under a limit is never shown as having reached it (59.9% is
 * "59%", not "60%").
 */
export function formatShare(part: number, whole: number): string {
  return `${Math.floor((part * 100) / Math.max(whole, 1))}%`;
}

/** "30 minutes", "1 hour", "1 day". */
export function formatStep(stepMs: number): string {
  const minutes = Math.round(stepMs / 60_000);
  const [amount, unit] =
    minutes % 1440 === 0
      ? [minutes / 1440, 'day']
      : minutes % 60 === 0
        ? [minutes / 60, 'hour']
        : [minutes, 'minute'];
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}
