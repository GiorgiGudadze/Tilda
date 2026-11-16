import { z } from 'zod';
import {
  spanSchema,
  statusSchema,
  timeBoundSchema,
  traceSummarySchema,
} from '@/lib/trace-model';

export const sortSchema = z.enum(['newest', 'oldest', 'slowest', 'fastest']);
/** How many traces the API returns per page. */
export const PAGE_SIZE = 25;

/**
 * Request names. The query string repeats `name` for several
 * (`?name=GET /orders&name=POST /login`), so it can arrive as one string or
 * a list. Once parsed it is always a list; empty means every name.
 */
const namesSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) =>
    (value === undefined ? [] : Array.isArray(value) ? value : [value]).filter(
      (name) => name !== '',
    ),
  );

/** The query of `GET /api/traces`. Every part is optional. */
export const traceListParamsSchema = z.object({
  /** Text to find in the operation or the trace ID. */
  q: z.string().default(''),
  /** Only traces in which this service took part, at any depth. */
  service: z.string().default(''),
  status: statusSchema.optional(),
  /** Only traces whose request is exactly one of these, as "GET /orders". */
  name: namesSchema,
  /** Only traces that took at least this many milliseconds. */
  minMs: z.coerce.number().int().min(0).optional(),
  /** Only traces that took at most this many milliseconds. */
  maxMs: z.coerce.number().int().min(0).optional(),
  /**
   * Only traces that started in this range: from the start, up to
   * but not including the end. Relative
   * bounds count back from the server's clock. Either end can be left out.
   */
  from: timeBoundSchema.optional(),
  to: timeBoundSchema.optional(),
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
   * Counts for the other filters of the sidebar. Each filter's counts apply
   * every filter but itself, so its other choices keep their counts when
   * one is picked.
   */
  facets: z.object({
    /** Every request name, in alphabetical order, even with a count of 0. */
    names: z.array(
      z.object({ name: z.string(), count: z.number().int().nonnegative() }),
    ),
  }),
});

/** The query of `GET /api/traces/points`: the list's filters that narrow by content. */
export const tracePointsParamsSchema = traceListParamsSchema.pick({
  q: true,
  service: true,
  status: true,
  name: true,
  from: true,
  to: true,
});

/** The most points `GET /api/traces/points` returns. The newest are kept. */
export const POINT_LIMIT = 1000;

/** One trace as a dot on the scatter plot. */
const tracePointSchema = traceSummarySchema.pick({
  id: true,
  operation: true,
  startedAt: true,
  durationMs: true,
  status: true,
});

export const tracePointsSchema = z.object({
  /**
   * Newest first, at most `POINT_LIMIT`. Like the bar counts, they apply
   * every filter except `duration`, so the plot shows what lies outside the
   * selected range too.
   */
  points: z.array(tracePointSchema),
  /** How many traces match, including any beyond the limit. */
  total: z.number().int().nonnegative(),
});

/** The query of `GET /api/traces/volume`: every filter of the list. */
export const traceVolumeParamsSchema = traceListParamsSchema.omit({
  sort: true,
  page: true,
});

/** The most bars `GET /api/traces/volume` returns. The step widens to fit. */
export const MAX_VOLUME_BARS = 60;

export const traceVolumeSchema = z.object({
  /**
   * The time the chart spans: the range asked for, with relative bounds
   * read on the server's clock, or all the data when none was asked.
   */
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  /** The width of one bar. A round step that divides a day. */
  stepMs: z.number().int().positive(),
  /** Oldest first, one per step, including the empty ones. */
  bars: z.array(
    z.object({
      start: z.iso.datetime(),
      ok: z.number().int().nonnegative(),
      error: z.number().int().nonnegative(),
    }),
  ),
});

export const traceDetailSchema = z.object({
  trace: traceSummarySchema,
  spans: z.array(spanSchema),
});

export const serviceListSchema = z.array(z.string());

export type Sort = z.infer<typeof sortSchema>;
export type TraceListParams = z.infer<typeof traceListParamsSchema>;
export type TraceList = z.infer<typeof traceListSchema>;
export type TracePointsParams = z.infer<typeof tracePointsParamsSchema>;
export type TracePoints = z.infer<typeof tracePointsSchema>;
export type TraceVolumeParams = z.infer<typeof traceVolumeParamsSchema>;
export type TraceVolume = z.infer<typeof traceVolumeSchema>;
export type TraceDetail = z.infer<typeof traceDetailSchema>;
