import { z } from 'zod';
import { confidenceSchema } from '@/features/investigation/schemas';

export const CAUSE_MAX_LENGTH = 300;

/**
 * What the AI concluded, apart from its text.
 *
 * A finding says where the problem is, how sure the AI is, what that is
 * based on, and which spans back it up. "No finding" means nothing looks
 * wrong, so there is no claim and no confidence.
 */
export const outcomeSchema = z.discriminatedUnion('kind', [
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
