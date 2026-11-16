import { z } from 'zod';
import { timeBoundSchema } from '@/lib/trace-model';

/** The query of `GET /api/services/:name/health`: a time range, both ends optional. */
export const serviceHealthParamsSchema = z.object({
  from: timeBoundSchema.optional(),
  to: timeBoundSchema.optional(),
});

/** The most steps the health answer has. The step widens to fit. */
export const MAX_HEALTH_STEPS = 60;

const count = z.number().int().nonnegative();
/** `null` when there was nothing to measure. */
const duration = z.number().nonnegative().nullable();

/** The calls to a service in one step of time. */
const healthStepSchema = z.object({
  start: z.iso.datetime(),
  ok: count,
  error: count,
  /** The median call. */
  medianMs: duration,
  /** The 95th percentile: 5% of calls were slower. */
  p95Ms: duration,
});

/** Another service, on one side of this one, and how the calls between them went. */
const dependencySchema = z.object({
  service: z.string(),
  calls: z.number().int().positive(),
  failed: count,
});

/**
 * How one service did over a time range. A call is one span of the service,
 * so a request that queries a database three times counts three times for
 * the database.
 */
export const serviceHealthSchema = z.object({
  service: z.string(),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  stepMs: z.number().int().positive(),
  calls: count,
  failed: count,
  medianMs: duration,
  p95Ms: duration,
  /** Oldest first, one per step, the empty ones included. */
  steps: z.array(healthStepSchema),
  /** Services that call this one, most calls first. */
  callers: z.array(dependencySchema),
  /** Services this one calls, most calls first. */
  callees: z.array(dependencySchema),
});

export type ServiceHealthParams = z.infer<typeof serviceHealthParamsSchema>;
export type Dependency = z.infer<typeof dependencySchema>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;
