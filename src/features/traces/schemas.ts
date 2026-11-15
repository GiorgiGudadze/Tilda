import { z } from 'zod';

export const statusSchema = z.enum(['ok', 'error']);

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

export const traceListSchema = z.object({
  items: z.array(traceSummarySchema),
  total: z.number().int().nonnegative(),
});

export const traceDetailSchema = z.object({
  trace: traceSummarySchema,
  spans: z.array(spanSchema),
});

export type Status = z.infer<typeof statusSchema>;
export type TraceSummary = z.infer<typeof traceSummarySchema>;
export type Span = z.infer<typeof spanSchema>;
export type TraceList = z.infer<typeof traceListSchema>;
export type TraceDetail = z.infer<typeof traceDetailSchema>;
