import type { Suggestion } from '@/features/suggestion/schemas';
import type { Span } from '@/features/traces/schemas';
import { selfTimes, slowestSpanId } from '@/features/traces/self-time';
import { SLOW_THRESHOLD_MS } from '@/features/traces/slow';
import { formatDuration, formatShare } from '@/lib/format';

/**
 * The simulated model. There is no AI here: seven fixed rules, checked in
 * order, decide what the suggestion says and how confident it is.
 *
 * Every text says where the problem is, never why. The data can show which
 * span failed or was slow. It cannot show the reason.
 */

/** One span takes this share of the trace or more: high confidence. */
const HIGH_SHARE_PERCENT = 60;
/** One span takes this share or more, but less than the high one: medium. */
const MEDIUM_SHARE_PERCENT = 30;

function nameOf(span: Span): string {
  return `${span.service}: ${span.operation}`;
}

function endOf(span: Span): number {
  return span.startMs + span.durationMs;
}

/** The span that ended first. On a tie, the one listed first. */
function firstToEnd(spans: Span[]): Span | undefined {
  return spans.reduce<Span | undefined>(
    (first, span) => (first && endOf(first) <= endOf(span) ? first : span),
    undefined,
  );
}

export function suggestCause(spans: Span[]): Suggestion {
  const root = spans.find((span) => span.parentId === null);
  if (!root) {
    return {
      outcome: { kind: 'no-finding' },
      text: 'This trace has no spans to look at.',
    };
  }

  const totalMs = root.durationMs;
  const failed = spans.filter((span) => span.status === 'error');
  // A failure usually travels up: a span fails, so its caller fails, and so
  // on. The failed spans with no failed child are where each failure began.
  const idsWithFailedChild = new Set(failed.map((span) => span.parentId));
  const origins = failed.filter((span) => !idsWithFailedChild.has(span.id));

  if (root.status === 'error') {
    const origin = origins[0];

    // Rule 1: the request failed, and the failure began in one place.
    if (origin && origins.length === 1) {
      return {
        outcome: {
          kind: 'finding',
          confidence: 'high',
          basis: 'error reached the request',
          evidenceSpanIds: [origin.id],
        },
        text:
          `The error first appears in ${nameOf(origin)}. ` +
          (failed.length === 1
            ? 'No other span failed.'
            : 'Every other failed span is one of its callers.'),
      };
    }

    // Rule 2: the request failed, and failures began in several places.
    const first = firstToEnd(origins) ?? root;
    return {
      outcome: {
        kind: 'finding',
        confidence: 'medium',
        basis: 'error reached the request, several spans failed',
        evidenceSpanIds: origins.map((span) => span.id),
      },
      text:
        `${origins.length} spans failed separately. The first to fail was ` +
        `${nameOf(first)}, ${formatDuration(endOf(first))} into the trace.`,
    };
  }

  const slow = totalMs >= SLOW_THRESHOLD_MS;
  const selfMsById = selfTimes(spans);
  const slowest = spans.find(
    (span) => span.id === slowestSpanId(spans, selfMsById),
  );
  const slowestMs = slowest ? (selfMsById.get(slowest.id) ?? 0) : 0;
  // Whole numbers on both sides, so exactly 60% counts as 60%.
  const reaches = (percent: number) => slowestMs * 100 >= percent * totalMs;

  if (slow && slowest && reaches(MEDIUM_SHARE_PERCENT)) {
    const high = reaches(HIGH_SHARE_PERCENT);
    const spent = `${formatDuration(slowestMs)} of ${formatDuration(totalMs)}, not counting its child spans`;

    // Rule 3: slow, and one span takes 60% of the time or more.
    // Rule 4: slow, and one span takes 30% or more, but less than 60%.
    return {
      outcome: {
        kind: 'finding',
        confidence: high ? 'high' : 'medium',
        basis: `${formatShare(slowestMs, totalMs)} of trace time`,
        evidenceSpanIds: [slowest.id],
      },
      text: high
        ? `Most of the time is spent in ${nameOf(slowest)}: ${spent}.`
        : `The largest share of the time is spent in ${nameOf(slowest)}: ${spent}. No other span takes more.`,
    };
  }

  // Rule 5: a span failed, but the request succeeded.
  const firstFailure = firstToEnd(origins);
  if (firstFailure) {
    return {
      outcome: {
        kind: 'finding',
        confidence: 'medium',
        basis: 'a span failed, the request succeeded',
        evidenceSpanIds: origins.map((span) => span.id),
      },
      text:
        `${nameOf(firstFailure)} failed, but the request succeeded. ` +
        'This may be a symptom of a problem, not the problem itself.',
    };
  }

  // Rule 6: slow, and nothing above applies.
  if (slow && slowest) {
    return {
      outcome: {
        kind: 'finding',
        confidence: 'low',
        basis: `largest span is ${formatShare(slowestMs, totalMs)} of trace time`,
        evidenceSpanIds: [slowest.id],
      },
      text:
        `No single span stands out. The time is spread over ${spans.length} spans. ` +
        `The largest is ${nameOf(slowest)}.`,
    };
  }

  // Rule 7: not slow, and nothing failed.
  return {
    outcome: { kind: 'no-finding' },
    text: 'Nothing looks wrong with this trace. It was not slow and no span failed.',
  };
}
