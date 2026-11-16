import { describe, expect, it } from 'vitest';
import {
  findQuickRange,
  formatSpan,
  toBound,
  inRange,
  isBound,
  isOrdered,
  QUICK_RANGES,
  rangeCaption,
  resolveBound,
} from '@/lib/time-range';

const NOW = Date.UTC(2026, 10, 14, 12, 0);

describe('resolveBound', () => {
  it('counts relative bounds back from now', () => {
    expect(resolveBound('now', NOW)).toBe(NOW);
    expect(resolveBound('now-15m', NOW)).toBe(NOW - 15 * 60_000);
    expect(resolveBound('now-6h', NOW)).toBe(Date.UTC(2026, 10, 14, 6, 0));
    expect(resolveBound(' now-1d ', NOW)).toBe(Date.UTC(2026, 10, 13, 12, 0));
  });

  it('reads a date and time as UTC, with or without seconds', () => {
    expect(resolveBound('2026-11-14 06:00', NOW)).toBe(
      Date.UTC(2026, 10, 14, 6, 0),
    );
    expect(resolveBound('2026-11-14T06:00:30', NOW)).toBe(
      Date.UTC(2026, 10, 14, 6, 0, 30),
    );
  });

  it('rejects anything else, including dates that do not exist', () => {
    for (const text of [
      '',
      'yesterday',
      'now+1h',
      'now-1w',
      '2026-11-14',
      '2026-02-30 10:00',
      '2026-11-14 24:00',
      '14/11/2026 06:00',
    ]) {
      expect(isBound(text)).toBe(false);
    }
  });
});

describe('isOrdered', () => {
  it('compares two times, or two relative bounds', () => {
    expect(
      isOrdered({ from: '2026-11-14 06:00', to: '2026-11-14 08:00' }),
    ).toBe(true);
    expect(
      isOrdered({ from: '2026-11-14 08:00', to: '2026-11-14 06:00' }),
    ).toBe(false);
    expect(isOrdered({ from: 'now-1h', to: 'now' })).toBe(true);
    expect(isOrdered({ from: 'now', to: 'now-1h' })).toBe(false);
  });

  it('leaves a mix of the two to the server', () => {
    expect(isOrdered({ from: '2026-11-14 06:00', to: 'now' })).toBe(true);
  });
});

describe('inRange', () => {
  it('includes the start and not the end', () => {
    const range = { from: 'now-1h', to: 'now' };
    expect(inRange(NOW - 3_600_000, range, NOW)).toBe(true);
    expect(inRange(NOW - 1, range, NOW)).toBe(true);
    expect(inRange(NOW, range, NOW)).toBe(false);
    expect(inRange(NOW - 3_600_001, range, NOW)).toBe(false);
  });
});

describe('rangeCaption', () => {
  it('names a quick range and all time', () => {
    expect(rangeCaption(null)).toBe('All time');
    expect(rangeCaption({ from: 'now-6h', to: 'now' })).toBe('Last 6 hours');
    expect(findQuickRange({ from: 'now-1h', to: 'now' })?.label).toBe(
      'Last hour',
    );
  });

  it('shows times in UTC and keeps relative bounds as written', () => {
    expect(
      rangeCaption({ from: '2026-11-14 06:00', to: '2026-11-14 08:00' }),
    ).toBe('14 Nov, 06:00 to 08:00 UTC');
    expect(
      rangeCaption({ from: '2026-11-13 22:00', to: '2026-11-14 02:00' }),
    ).toBe('13 Nov, 22:00 to 14 Nov, 02:00 UTC');
    expect(rangeCaption({ from: '2026-11-14 06:00', to: 'now' })).toBe(
      '14 Nov, 06:00 to now UTC',
    );
    expect(rangeCaption({ from: 'now-2h', to: 'now-1h' })).toBe(
      'now-2h to now-1h',
    );
  });

  it('has quick ranges that are all valid and in order', () => {
    for (const range of QUICK_RANGES) {
      expect(isBound(range.from) && isOrdered(range)).toBe(true);
    }
  });
});

describe('formatSpan and toBound', () => {
  it('says the date once on one day, twice across midnight', () => {
    expect(
      formatSpan(Date.UTC(2026, 10, 14, 6, 0), Date.UTC(2026, 10, 14, 6, 30)),
    ).toBe('14 Nov, 06:00 to 06:30 UTC');
    expect(
      formatSpan(Date.UTC(2026, 10, 13, 23, 30), Date.UTC(2026, 10, 14, 0, 0)),
    ).toBe('13 Nov, 23:30 to 14 Nov, 00:00 UTC');
  });

  it('writes a moment as a bound that reads back the same', () => {
    const ms = Date.UTC(2026, 10, 14, 6, 30);
    expect(toBound(ms)).toBe('2026-11-14 06:30');
    expect(resolveBound(toBound(ms), 0)).toBe(ms);
  });
});
