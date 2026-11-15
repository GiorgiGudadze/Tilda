import { z } from 'zod';
import { DURATION_BUCKET_KEYS } from '@/features/traces/duration-buckets';

export const statusSchema = z.enum(['ok', 'error']);
export const sortSchema = z.enum(['newest', 'slowest']);
export const durationBucketKeySchema = z.enum(DURATION_BUCKET_KEYS);

/** How many traces the API returns per page. */
export const PAGE_SIZE = 25;

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

/** The query of `GET /api/traces`. Every part is optional. */
export const traceListParamsSchema = z.object({
  /** Text to find in the operation or the trace ID. */
  q: z.string().default(''),
  /** Only traces in which this service took part, at any depth. */
  service: z.string().default(''),
  status: statusSchema.optional(),
  duration: durationBucketKeySchema.optional(),
  sort: sortSchema.default('newest'),
  /** Starts at 1. */
  page: z.coerce.number().int().min(1).default(1),
});

export const traceListSchema = z.object({
  /** One page. A page beyond the last returns the last page. */
  items: z.array(traceSummarySchema),
  /** How many traces match all filters, on all pages. */
  total: z.number().int().nonnegative(),
  /**
   * Traces per duration range, for the chart. These counts apply every
   * filter except `duration`, so the chart keeps its shape when a bar is
   * selected.
   */
  buckets: z.array(
    z.object({
      key: durationBucketKeySchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});

export const traceDetailSchema = z.object({
  trace: traceSummarySchema,
  spans: z.array(spanSchema),
});

export const serviceListSchema = z.array(z.string());

export type Status = z.infer<typeof statusSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type TraceSummary = z.infer<typeof traceSummarySchema>;
export type Span = z.infer<typeof spanSchema>;
export type TraceListParams = z.infer<typeof traceListParamsSchema>;
export type TraceList = z.infer<typeof traceListSchema>;
export type TraceDetail = z.infer<typeof traceDetailSchema>;
