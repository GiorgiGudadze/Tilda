import { describe, expect, it } from 'vitest';
import type { Span, Status } from '@/lib/trace-model';
import { createDataset, SEEDED_TRACE_IDS } from '@/mocks/seed';
import { suggestCause } from '@/mocks/suggest';

/** A span from `from` to `to`. Its ID doubles as its operation. */
function span(
  id: string,
  parentId: string | null,
  from: number,
  to: number,
  status: Status = 'ok',
): Span {
  return {
    id,
    parentId,
    service: 'svc',
    operation: id,
    startMs: from,
    durationMs: to - from,
    status,
  };
}

/** What a case expects: `null` confidence means no finding. */
interface Expected {
  confidence: 'high' | 'medium' | 'low' | null;
  basis?: string;
  evidence?: string[];
  /** A part of the text, usually the span it names. */
  says: string;
}

const cases: [name: string, spans: Span[], expected: Expected][] = [
  [
    'rule 1: the request failed, the failure began in one place',
    [
      span('root', null, 0, 500, 'error'),
      span('ok', 'root', 10, 100),
      span('caller', 'root', 110, 490, 'error'),
      span('origin', 'caller', 120, 480, 'error'),
    ],
    {
      confidence: 'high',
      basis: 'error reached the request',
      evidence: ['origin'],
      says: 'The error first appears in svc: origin. Every other failed span is one of its callers.',
    },
  ],
  [
    'rule 1: only the request itself failed',
    [span('root', null, 0, 500, 'error'), span('ok', 'root', 10, 100)],
    {
      confidence: 'high',
      evidence: ['root'],
      says: 'The error first appears in svc: root. No other span failed.',
    },
  ],
  [
    'rule 1 wins over slowness: a failed request that is also slow',
    [
      span('root', null, 0, 3000, 'error'),
      span('slow-and-failed', 'root', 10, 2900, 'error'),
    ],
    {
      confidence: 'high',
      basis: 'error reached the request',
      evidence: ['slow-and-failed'],
      says: 'svc: slow-and-failed',
    },
  ],
  [
    'rule 2: the request failed, failures began in several places',
    [
      span('root', null, 0, 500, 'error'),
      span('later', 'root', 10, 400, 'error'),
      span('earlier', 'root', 20, 300, 'error'),
    ],
    {
      confidence: 'medium',
      basis: 'error reached the request, several spans failed',
      evidence: ['later', 'earlier'],
      says: 'The first to fail was svc: earlier, 300 ms into the trace.',
    },
  ],
  [
    'rule 3: slow, one span is 60% or more',
    [span('root', null, 0, 2000), span('big', 'root', 100, 1700)],
    {
      confidence: 'high',
      basis: '80% of trace time',
      evidence: ['big'],
      says: 'Most of the time is spent in svc: big: 1.60 s of 2.00 s',
    },
  ],
  [
    'rule 3 boundary: exactly 60% is high',
    [span('root', null, 0, 1000), span('big', 'root', 0, 600)],
    { confidence: 'high', basis: '60% of trace time', says: 'svc: big' },
  ],
  [
    'rule 4 boundary: just under 60% is medium',
    [span('root', null, 0, 1000), span('big', 'root', 0, 599)],
    { confidence: 'medium', basis: '59% of trace time', says: 'svc: big' },
  ],
  [
    'rule 4 boundary: exactly 30% is medium',
    [
      span('root', null, 0, 1000),
      span('a', 'root', 0, 300),
      span('b', 'root', 300, 550),
      span('c', 'root', 550, 800),
    ],
    {
      confidence: 'medium',
      basis: '30% of trace time',
      evidence: ['a'],
      says: 'The largest share of the time is spent in svc: a',
    },
  ],
  [
    'rule 6 boundary: just under 30% is low',
    [
      span('root', null, 0, 1000),
      span('a', 'root', 0, 299),
      span('b', 'root', 299, 549),
      span('c', 'root', 549, 799),
    ],
    {
      confidence: 'low',
      basis: 'largest span is 29% of trace time',
      evidence: ['a'],
      says: 'No single span stands out.',
    },
  ],
  [
    'the tie: on equal self time the earlier span is named',
    [
      span('root', null, 0, 1000),
      span('second', 'root', 500, 900),
      span('first', 'root', 50, 450),
    ],
    {
      confidence: 'medium',
      basis: '40% of trace time',
      evidence: ['first'],
      says: 'svc: first',
    },
  ],
  [
    'rule 3 wins over rule 5: slow with a clear span, and a handled failure',
    [
      span('root', null, 0, 2000),
      span('big', 'root', 0, 1500),
      span('handled', 'root', 1500, 1600, 'error'),
    ],
    { confidence: 'high', evidence: ['big'], says: 'svc: big' },
  ],
  [
    'rule 5: a span failed, the request succeeded',
    [
      span('root', null, 0, 400),
      span('fine', 'root', 0, 100),
      span('handled', 'root', 100, 200, 'error'),
    ],
    {
      confidence: 'medium',
      basis: 'a span failed, the request succeeded',
      evidence: ['handled'],
      says: 'svc: handled failed, but the request succeeded. This may be a symptom',
    },
  ],
  [
    'rule 5 wins over rule 6: slow with no clear span, and a handled failure',
    [
      span('root', null, 0, 1000),
      span('a', 'root', 0, 250),
      span('b', 'root', 250, 500, 'error'),
      span('c', 'root', 500, 750),
    ],
    { confidence: 'medium', evidence: ['b'], says: 'svc: b failed' },
  ],
  [
    'rule 6: slow, nothing stands out',
    [
      span('root', null, 0, 1000),
      span('a', 'root', 0, 200),
      span('b', 'root', 200, 400),
      span('c', 'root', 400, 600),
      span('d', 'root', 600, 800),
    ],
    {
      confidence: 'low',
      basis: 'largest span is 20% of trace time',
      evidence: ['root'],
      says: 'The time is spread over 5 spans.',
    },
  ],
  [
    'slow boundary: exactly 1 s is slow',
    [span('root', null, 0, 1000)],
    { confidence: 'high', basis: '100% of trace time', says: 'svc: root' },
  ],
  [
    'rule 7: just under 1 s with no failure is not slow',
    [span('root', null, 0, 999), span('big', 'root', 0, 900)],
    { confidence: null, says: 'Nothing looks wrong with this trace.' },
  ],
  [
    'no spans at all',
    [],
    { confidence: null, says: 'This trace has no spans to look at.' },
  ],
];

describe('suggestCause', () => {
  it.each(cases)('%s', (_name, spans, expected) => {
    const { outcome, text } = suggestCause(spans);

    // The outcome in the shape of `Expected`, so one check covers both
    // a finding and no finding.
    const actual =
      outcome.kind === 'finding'
        ? {
            confidence: outcome.confidence,
            basis: outcome.basis,
            evidence: outcome.evidenceSpanIds,
          }
        : { confidence: null };
    const { says, ...wanted } = expected;

    expect(text).toContain(says);
    expect(actual).toMatchObject(wanted);
  });

  it('never says why, only where', () => {
    for (const [, spans] of cases) {
      expect(suggestCause(spans).text).not.toMatch(/because|due to|caused by/i);
    }
  });

  describe('the three hand-written traces', () => {
    const dataset = createDataset();
    const suggest = (id: string) =>
      suggestCause(dataset.spansByTraceId.get(id) ?? []);

    it('finds the slow query with high confidence', () => {
      expect(suggest(SEEDED_TRACE_IDS.slowQuery)).toEqual({
        outcome: {
          kind: 'finding',
          confidence: 'high',
          basis: '78% of trace time',
          evidenceSpanIds: ['s5'],
        },
        text: 'Most of the time is spent in postgres: SELECT orders WHERE user_id = ?: 2.26 s of 2.90 s, not counting its child spans.',
      });
    });

    it('finds where the error began with high confidence', () => {
      expect(suggest(SEEDED_TRACE_IDS.error)).toEqual({
        outcome: {
          kind: 'finding',
          confidence: 'high',
          basis: 'error reached the request',
          evidenceSpanIds: ['s10'],
        },
        text: 'The error first appears in payments: POST card-acquirer /authorize. Every other failed span is one of its callers.',
      });
    });

    it('is unsure about the trace where nothing stands out', () => {
      expect(suggest(SEEDED_TRACE_IDS.uncertain).outcome).toEqual({
        kind: 'finding',
        confidence: 'low',
        basis: 'largest span is 18% of trace time',
        evidenceSpanIds: ['s6'],
      });
    });
  });

  it('gives every generated trace a suggestion that names real spans', () => {
    const dataset = createDataset();
    const kinds = new Set<string>();
    const unknownEvidence: string[] = [];
    const findingsWithoutEvidence: string[] = [];

    for (const [traceId, spans] of dataset.spansByTraceId) {
      const { outcome } = suggestCause(spans);
      if (outcome.kind === 'no-finding') {
        kinds.add('none');
        continue;
      }
      kinds.add(outcome.confidence);
      const ids = new Set(spans.map((item) => item.id));
      if (outcome.evidenceSpanIds.length === 0) {
        findingsWithoutEvidence.push(traceId);
      }
      unknownEvidence.push(
        ...outcome.evidenceSpanIds.filter((id) => !ids.has(id)),
      );
    }

    expect(findingsWithoutEvidence).toEqual([]);
    expect(unknownEvidence).toEqual([]);
    // The demo data shows every kind of answer.
    expect([...kinds].sort()).toEqual(['high', 'low', 'medium', 'none']);
  });
});
