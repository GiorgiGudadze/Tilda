import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDuration,
  formatShare,
  formatStep,
} from '@/lib/format';

describe('formatDuration', () => {
  it.each([
    [0, '0 ms'],
    [42, '42 ms'],
    [999, '999 ms'],
    [1000, '1.00 s'],
    [2840, '2.84 s'],
    [12345, '12.35 s'],
  ])('formats %d ms as "%s"', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatDateTime', () => {
  it('shows the time in UTC, whatever the local time zone is', () => {
    expect(formatDateTime('2026-11-14T11:58:00.000Z')).toBe(
      '14 Nov, 11:58:00 UTC',
    );
  });
});

describe('formatShare', () => {
  it.each([
    [2262, 2900, '78%'],
    [600, 1000, '60%'],
    [599, 1000, '59%'],
    [299, 1000, '29%'],
    [0, 1000, '0%'],
    [1000, 1000, '100%'],
    [5, 0, '500%'],
  ])('writes %d of %d as "%s"', (part, whole, expected) => {
    expect(formatShare(part, whole)).toBe(expected);
  });
});

describe('formatStep', () => {
  it('names a step in its largest whole unit', () => {
    expect(formatStep(60_000)).toBe('1 minute');
    expect(formatStep(30 * 60_000)).toBe('30 minutes');
    expect(formatStep(60 * 60_000)).toBe('1 hour');
    expect(formatStep(180 * 60_000)).toBe('3 hours');
    expect(formatStep(1440 * 60_000)).toBe('1 day');
    expect(formatStep(7 * 1440 * 60_000)).toBe('7 days');
  });
});
