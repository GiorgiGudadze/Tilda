import { z } from 'zod';
import { traceSummarySchema } from '@/features/traces/schemas';

export const NOTE_MAX_LENGTH = 500;

export const pinStatusSchema = z.enum(['open', 'resolved']);
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

/** What a pin holds about its trace. */
export const pinFieldsSchema = z.object({
  status: pinStatusSchema,
  note: z.string().max(NOTE_MAX_LENGTH),
  decision: decisionSchema.nullable(),
});

/**
 * The body of `PUT`. It creates the pin, or changes only the fields it
 * names. So two saves of different fields cannot overwrite each other,
 * whichever reaches the server first.
 */
export const pinChangesSchema = pinFieldsSchema.partial();

/** What a new pin starts with. */
export const NEW_PIN: PinFields = { status: 'open', note: '', decision: null };

/** A pinned trace, with the trace's own summary for display. */
export const pinSchema = pinFieldsSchema.extend({
  traceId: z.string(),
  trace: traceSummarySchema,
});

export const pinListSchema = z.array(pinSchema);

export type PinStatus = z.infer<typeof pinStatusSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type PinFields = z.infer<typeof pinFieldsSchema>;
export type PinChanges = z.infer<typeof pinChangesSchema>;
export type Pin = z.infer<typeof pinSchema>;
