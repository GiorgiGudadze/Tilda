import { describe, expect, it } from 'vitest';
import { spanSchema, traceSummarySchema } from '@/lib/trace-model';
import {
  createDataset,
  INCIDENT,
  SEED_NOW,
  SEEDED_TRACE_IDS,
} from '@/mocks/seed';

const dataset = createDataset();
const allSpans = [...dataset.spansByTraceId.values()];

describe('createDataset', () => {
  it('gives the same data on every run', () => {
    const again = createDataset();
    expect(again.traces).toEqual(dataset.traces);
    expect([...again.spansByTraceId]).toEqual([...dataset.spansByTraceId]);
  });

  it('gives different data for a different seed', () => {
    expect(createDataset(1).traces).not.toEqual(dataset.traces);
  });

  it('produces traces and spans that match the API schemas', () => {
    for (const trace of dataset.traces) {
      expect(traceSummarySchema.safeParse(trace).success).toBe(true);
    }
    for (const span of allSpans.flat()) {
      expect(spanSchema.safeParse(span).success).toBe(true);
    }
  });

  it('gives every trace a unique ID', () => {
    const ids = new Set(dataset.traces.map((trace) => trace.id));
    expect(ids.size).toBe(dataset.traces.length);
  });

  it('lists traces newest first, none after the fixed clock', () => {
    const times = dataset.traces.map((trace) => Date.parse(trace.startedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(Math.max(...times)).toBeLessThanOrEqual(SEED_NOW);
  });

  it('gives every trace one root span that covers the whole trace', () => {
    for (const trace of dataset.traces) {
      const spans = dataset.spansByTraceId.get(trace.id) ?? [];
      const roots = spans.filter((span) => span.parentId === null);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toMatchObject({
        startMs: 0,
        durationMs: trace.durationMs,
        status: trace.status,
      });
      expect(trace.spanCount).toBe(spans.length);
    }
  });

  it('never puts a child outside the interval of its parent', () => {
    for (const spans of allSpans) {
      const byId = new Map(spans.map((span) => [span.id, span]));
      for (const span of spans) {
        if (span.parentId === null) continue;
        const parent = byId.get(span.parentId);
        expect(parent).toBeDefined();
        if (!parent) continue;
        expect(span.startMs).toBeGreaterThanOrEqual(parent.startMs);
        expect(span.startMs + span.durationMs).toBeLessThanOrEqual(
          parent.startMs + parent.durationMs,
        );
      }
    }
  });

  it('keeps every trace at 30 spans or fewer', () => {
    for (const spans of allSpans) {
      expect(spans.length).toBeLessThanOrEqual(30);
    }
  });

  it('includes slow, failed and healthy traces', () => {
    const slow = dataset.traces.filter((trace) => trace.durationMs >= 1000);
    const failed = dataset.traces.filter((trace) => trace.status === 'error');
    const stepFailedOnly = dataset.traces.filter(
      (trace) =>
        trace.status === 'ok' &&
        dataset.spansByTraceId
          .get(trace.id)
          ?.some((span) => span.status === 'error'),
    );
    expect(slow.length).toBeGreaterThan(5);
    expect(failed.length).toBeGreaterThan(5);
    expect(stepFailedOnly.length).toBeGreaterThan(0);
    expect(slow.length + failed.length).toBeLessThan(dataset.traces.length / 2);
  });
});

describe('the incident', () => {
  function slowShare(inside: boolean) {
    const traces = dataset.traces.filter((trace) => {
      const time = Date.parse(trace.startedAt);
      return (time >= INCIDENT.fromMs && time < INCIDENT.toMs) === inside;
    });
    const slow = traces.filter((trace) => trace.durationMs >= 1000);
    return slow.length / traces.length;
  }

  it('makes most requests slow for two hours, and few at other times', () => {
    expect(slowShare(true)).toBeGreaterThan(0.7);
    expect(slowShare(false)).toBeLessThan(0.1);
  });
});

describe('the three hand-written traces', () => {
  function find(id: string) {
    const trace = dataset.traces.find((item) => item.id === id);
    const spans = dataset.spansByTraceId.get(id) ?? [];
    return { trace, spans };
  }

  it('are the three newest traces', () => {
    expect(dataset.traces.slice(0, 3).map((trace) => trace.id)).toEqual([
      SEEDED_TRACE_IDS.slowQuery,
      SEEDED_TRACE_IDS.error,
      SEEDED_TRACE_IDS.uncertain,
    ]);
  });

  it('has a slow trace where one query takes most of the time', () => {
    const { trace, spans } = find(SEEDED_TRACE_IDS.slowQuery);
    expect(trace).toMatchObject({ status: 'ok', durationMs: 2900 });
    const query = spans.find(
      (span) => span.operation === 'SELECT orders WHERE user_id = ?',
    );
    expect(query?.durationMs).toBe(2262);
  });

  it('has a failed trace with one failed path down to the acquirer call', () => {
    const { trace, spans } = find(SEEDED_TRACE_IDS.error);
    expect(trace).toMatchObject({ status: 'error', durationMs: 640 });
    const failed = spans.filter((span) => span.status === 'error');
    expect(failed.map((span) => span.operation)).toEqual([
      'POST /checkout',
      'create order',
      'charge card',
      'POST card-acquirer /authorize',
    ]);
  });

  it('has a slow trace with no failures and no step that stands out', () => {
    const { trace, spans } = find(SEEDED_TRACE_IDS.uncertain);
    expect(trace).toMatchObject({ status: 'ok', durationMs: 1640 });
    expect(spans.every((span) => span.status === 'ok')).toBe(true);
  });
});
