import { z } from 'zod';
import { isBound } from '@/lib/time-range';

/**
 * The shapes every feature shares: a request (trace), one step in it (span),
 * how it ended, and a bound of a time range. The traces feature owns the API
 * around them; the suggestion and services features only read them.
 */

export const statusSchema = z.enum(['ok', 'error']);

/** `now`, `now-6h` or `2026-11-14 06:00` (UTC). See `@/lib/time-range`. */
export const timeBoundSchema = z
  .string()
  .refine(isBound, 'Use now, now-6h or 2026-11-14 06:00');

/** One request, as a row in the list. */
export const traceSummarySchema = z.object({
  id: z.string(),
  /** Service and operation of the root span, the entry point of the request. */
  service: z.string(),
  operation: z.string(),
  startedAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  /** The status of the request itself. A step can fail while the request succeeds. */
  status: statusSchema,
  spanCount: z.number().int().positive(),
});

/** One step inside a request. */
export const spanSchema = z.object({
  id: z.string(),
  /** `null` for the root span. */
  parentId: z.string().nullable(),
  service: z.string(),
  operation: z.string(),
  /** Offset from the start of the trace, not a clock time. */
  startMs: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  status: statusSchema,
});

export type Status = z.infer<typeof statusSchema>;
export type TraceSummary = z.infer<typeof traceSummarySchema>;
export type Span = z.infer<typeof spanSchema>;
