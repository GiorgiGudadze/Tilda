import { z } from 'zod';

export const CAUSE_MAX_LENGTH = 300;

export const confidenceSchema = z.enum(['high', 'medium', 'low']);

/**
 * What the user decided about the AI's suggested cause. A suggestion is
 * never the conclusion by itself: a cause exists only once a person has
 * accepted it, edited it or rejected it.
 */
export const decisionSchema = z.object({
  kind: z.enum(['accepted', 'edited', 'rejected']),
  /** What the AI wrote, kept so an edit can always be compared with it. */
  originalText: z.string(),
  /** The cause on record. Empty when the suggestion was rejected. */
  finalText: z.string(),
  /** `null` when the AI found nothing wrong and so made no claim. */
  confidence: confidenceSchema.nullable(),
  /** What the confidence is based on, as the AI gave it. `null` with no claim. */
  basis: z.string().nullable(),
  /** The spans the suggestion is based on. */
  evidenceSpanIds: z.array(z.string()),
});

/** A stored decision, with the trace it is about. */
export const traceDecisionSchema = z.object({
  traceId: z.string(),
  decision: decisionSchema,
});

export const traceDecisionListSchema = z.array(traceDecisionSchema);

/**
 * What the AI concluded, apart from its text.
 *
 * A finding says where the problem is, how sure the AI is, what that is
 * based on, and which spans back it up. "No finding" means nothing looks
 * wrong, so there is no claim and no confidence.
 */
const outcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('finding'),
    confidence: confidenceSchema,
    /** One short line, shown beside the confidence: "78% of trace time". */
    basis: z.string(),
    evidenceSpanIds: z.array(z.string()),
  }),
  z.object({ kind: z.literal('no-finding') }),
]);

/**
 * One line of the response of `POST /api/traces/:id/suggestion`. The lines
 * come in this order: one `meta`, any number of `text`, one `done`.
 */
export const suggestionEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meta'), outcome: outcomeSchema }),
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('done') }),
]);

export type Outcome = z.infer<typeof outcomeSchema>;
export type SuggestionEvent = z.infer<typeof suggestionEventSchema>;

/** A complete suggestion: its text and what the AI concluded. */
export interface Suggestion {
  text: string;
  outcome: Outcome;
}

export type Decision = z.infer<typeof decisionSchema>;
export type TraceDecision = z.infer<typeof traceDecisionSchema>;
