import { describe, expect, it } from 'vitest';
import {
  countTicks,
  durationPosition,
  snapToSteps,
  timePosition,
  timeTicks,
  volumeStep,
} from '@/lib/scales';

const MINUTE = 60_000;

const at = (iso: string) => Date.parse(iso);

describe('durationPosition', () => {
  it('gives each power of ten the same room', () => {
    expect(durationPosition(10)).toBe(0);
    expect(durationPosition(100)).toBeCloseTo(1 / 3);
    expect(durationPosition(1000)).toBeCloseTo(2 / 3);
    expect(durationPosition(10_000)).toBe(1);
  });

  it('draws a value outside the axis at its edge', () => {
    expect(durationPosition(2)).toBe(0);
    expect(durationPosition(0)).toBe(0);
    expect(durationPosition(60_000)).toBe(1);
  });
});

describe('timePosition', () => {
  it('places a time between the two ends', () => {
    expect(timePosition(150, 100, 200)).toBe(0.5);
  });

  it('puts the only time in the middle when both ends are the same', () => {
    expect(timePosition(100, 100, 100)).toBe(0.5);
  });
});

describe('timeTicks', () => {
  it('picks a step that keeps the number of ticks small', () => {
    const ticks = timeTicks(
      at('2026-11-13T11:45:00Z'),
      at('2026-11-14T11:58:00Z'),
    );
    expect(ticks.map((tick) => tick.label)).toEqual([
      '12:00',
      '18:00',
      '14 Nov',
      '06:00',
    ]);
  });

  it('uses round minutes for a short span', () => {
    const ticks = timeTicks(
      at('2026-11-14T10:03:00Z'),
      at('2026-11-14T10:41:00Z'),
    );
    expect(ticks.map((tick) => tick.label)).toEqual([
      '10:10',
      '10:20',
      '10:30',
      '10:40',
    ]);
  });

  it('never gives more ticks than asked', () => {
    for (const minutes of [1, 7, 45, 90, 600, 1500, 4000]) {
      const from = at('2026-11-14T00:07:00Z');
      const ticks = timeTicks(from, from + minutes * 60_000, 5);
      expect(ticks.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('volumeStep', () => {
  it('picks the smallest round step that fits', () => {
    expect(volumeStep(24 * 60 * MINUTE, 60)).toBe(30 * MINUTE);
    expect(volumeStep(60 * MINUTE, 60)).toBe(MINUTE);
    expect(volumeStep(61 * MINUTE, 60)).toBe(2 * MINUTE);
    expect(volumeStep(6 * 60 * MINUTE, 60)).toBe(10 * MINUTE);
  });

  it('goes past a day for very long spans', () => {
    expect(volumeStep(365 * 24 * 60 * MINUTE, 60)).toBe(7 * 24 * 60 * MINUTE);
  });
});

describe('countTicks', () => {
  it('rounds the top up and keeps the steps round', () => {
    expect(countTicks(0)).toEqual([0, 1]);
    expect(countTicks(1)).toEqual([0, 1]);
    expect(countTicks(3)).toEqual([0, 1, 2, 3]);
    expect(countTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(countTicks(23)).toEqual([0, 10, 20, 30]);
    expect(countTicks(40)).toEqual([0, 10, 20, 30, 40]);
    expect(countTicks(118)).toEqual([0, 50, 100, 150]);
  });
});

describe('snapToSteps', () => {
  const step = 30 * MINUTE;

  it('widens a drag to whole steps, in either direction', () => {
    expect(snapToSteps(40 * MINUTE, 100 * MINUTE, step)).toEqual({
      fromMs: 30 * MINUTE,
      toMs: 120 * MINUTE,
    });
    expect(snapToSteps(100 * MINUTE, 40 * MINUTE, step)).toEqual({
      fromMs: 30 * MINUTE,
      toMs: 120 * MINUTE,
    });
  });

  it('turns a click into its own bar', () => {
    expect(snapToSteps(40 * MINUTE, 40 * MINUTE, step)).toEqual({
      fromMs: 30 * MINUTE,
      toMs: 60 * MINUTE,
    });
  });
});
