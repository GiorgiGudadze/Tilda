import type { Span, TraceSummary } from '@/lib/trace-model';

/**
 * Demo data. The same seed always gives the same traces: random numbers come
 * from a seeded generator, and every time is counted back from one "now".
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The "now" of the demo data: when the page loaded, to the minute. A deployed
 * demo then always has traces in "Last 1 hour", and its dates are today's.
 * The traces are the same on every visit; only their times move.
 *
 * Unit tests set `VITE_DEMO_NOW` (see vite.config.ts), so they see the same
 * times on every run.
 */
function demoNow(): number {
  const fixed = import.meta.env.VITE_DEMO_NOW;
  if (fixed) {
    return Date.parse(fixed);
  }
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

export const SEED_NOW = demoNow();

/** Three hand-written traces that are always present, linked from the README. */
export const SEEDED_TRACE_IDS = {
  slowQuery: 'a1b2c3d4e5f60001',
  error: 'a1b2c3d4e5f60002',
  uncertain: 'a1b2c3d4e5f60003',
} as const;

export interface Dataset {
  /** Newest first. */
  traces: TraceSummary[];
  spansByTraceId: Map<string, Span[]>;
}

/**
 * Two hours in which the database was overloaded: most requests that started
 * then have one slow query. It gives the scatter plot something to show.
 */
export const INCIDENT = {
  fromMs: SEED_NOW - 6 * HOUR,
  toMs: SEED_NOW - 4 * HOUR,
};

function inIncident(startedAtMs: number): boolean {
  return startedAtMs >= INCIDENT.fromMs && startedAtMs < INCIDENT.toMs;
}

// ---------------------------------------------------------------------------
// Seeded random numbers
// ---------------------------------------------------------------------------

type Random = () => number;

/** mulberry32: a small public-domain generator. Returns numbers in [0, 1). */
function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(random: Random, items: T[]): T | undefined {
  return items[Math.floor(random() * items.length)];
}

function randomHex(random: Random): string {
  return Math.floor(random() * 0x100000000)
    .toString(16)
    .padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Request templates
// ---------------------------------------------------------------------------

/** One step of a request template. Becomes one span. */
interface Step {
  service: string;
  operation: string;
  /** The step's own work in ms, as [min, max]. Time in children comes on top. */
  work: [min: number, max: number];
  children?: Step[];
  /** Children start together instead of one after another. */
  parallel?: boolean;
  /** The caller handles a failure here, so it does not fail the request. */
  optional?: boolean;
}

function query(operation: string): Step {
  return { service: 'postgres', operation, work: [3, 25] };
}

function cache(operation: string): Step {
  return { service: 'redis', operation, work: [1, 4], optional: true };
}

const verifyToken: Step = {
  service: 'auth',
  operation: 'verify token',
  work: [4, 12],
  children: [{ service: 'redis', operation: 'GET session', work: [1, 4] }],
};

const stockLookup: Step = {
  service: 'inventory',
  operation: 'POST /stock/lookup',
  work: [5, 15],
  children: [query('SELECT stock WHERE sku IN (?)')],
};

function gateway(operation: string, children: Step[], parallel = false): Step {
  return {
    service: 'api-gateway',
    operation,
    work: [2, 8],
    children,
    parallel,
  };
}

const TEMPLATES: Step[] = [
  gateway('GET /orders', [
    verifyToken,
    {
      service: 'orders',
      operation: 'list orders',
      work: [10, 30],
      children: [
        query('SELECT orders WHERE user_id = ?'),
        query('SELECT order_items WHERE order_id IN (?)'),
        stockLookup,
      ],
    },
  ]),
  gateway('POST /checkout', [
    verifyToken,
    {
      service: 'orders',
      operation: 'create order',
      work: [15, 40],
      children: [
        query('INSERT orders'),
        {
          service: 'inventory',
          operation: 'reserve stock',
          work: [5, 15],
          children: [query('UPDATE stock SET reserved = ?')],
        },
        {
          service: 'payments',
          operation: 'charge card',
          work: [10, 25],
          children: [
            query('SELECT payment_methods WHERE user_id = ?'),
            {
              service: 'payments',
              operation: 'POST card-acquirer /authorize',
              work: [120, 420],
            },
          ],
        },
        query('UPDATE orders SET status = ?'),
        cache('PUBLISH order.created'),
      ],
    },
  ]),
  gateway('GET /products/search', [
    verifyToken,
    {
      service: 'catalog',
      operation: 'search products',
      work: [10, 30],
      children: [
        cache('GET search:cache'),
        query('SELECT products WHERE name ILIKE ?'),
        query('SELECT prices WHERE product_id IN (?)'),
        stockLookup,
        cache('SET search:cache'),
      ],
    },
  ]),
  // The gateway asks two services at once, so these children overlap.
  gateway(
    'GET /products/:id',
    [
      {
        service: 'catalog',
        operation: 'get product',
        work: [5, 15],
        children: [
          cache('GET product:cache'),
          query('SELECT products WHERE id = ?'),
          query('SELECT prices WHERE product_id = ?'),
        ],
      },
      {
        service: 'inventory',
        operation: 'GET /stock/:sku',
        work: [5, 15],
        children: [query('SELECT stock WHERE sku = ?')],
      },
    ],
    true,
  ),
  gateway('POST /login', [
    {
      service: 'auth',
      operation: 'log in',
      work: [60, 140],
      children: [
        query('SELECT users WHERE email = ?'),
        { service: 'redis', operation: 'SET session', work: [1, 4] },
      ],
    },
  ]),
];

function allSteps(step: Step): Step[] {
  return [step, ...(step.children ?? []).flatMap(allSteps)];
}

// ---------------------------------------------------------------------------
// Generated traces
// ---------------------------------------------------------------------------

/** What goes wrong in one generated trace. Most traces have nothing wrong. */
interface Fault {
  /** This step fails. */
  failingStep?: Step;
  /** This step takes `slowExtraMs` longer than usual. */
  slowStep?: Step;
  slowExtraMs: number;
  /** Every step is this many times slower, as on an overloaded system. */
  workFactor: number;
}

function chooseFault(
  random: Random,
  template: Step,
  duringIncident: boolean,
): Fault {
  const steps = allSteps(template);
  const fault: Fault = { slowExtraMs: 0, workFactor: 1 };
  const roll = random();

  if (duringIncident && roll < 0.9) {
    // The overloaded database: one query waits far longer than usual.
    fault.slowStep = pick(
      random,
      steps.filter((step) => step.service === 'postgres'),
    );
    fault.slowExtraMs = randomInt(random, 900, 2600);
  } else if (roll < 0.02) {
    // A required step fails, and the failure reaches the request. Rare, as
    // in a healthy system, so a red mark on the charts means something.
    fault.failingStep = pick(
      random,
      steps.filter((step) => !step.children && !step.optional),
    );
  } else if (roll < 0.08) {
    // An optional step fails, and the request still succeeds.
    fault.failingStep = pick(
      random,
      steps.filter((step) => step.optional),
    );
  } else if (roll < 0.14) {
    // One slow query.
    fault.slowStep = pick(
      random,
      steps.filter((step) => step.service === 'postgres'),
    );
    fault.slowExtraMs = randomInt(random, 400, 3000);
  } else if (roll < 0.17) {
    // Everything is slow, so no single step stands out.
    fault.workFactor = randomInt(random, 5, 10);
  }

  return fault;
}

/**
 * Adds the span for `step` and, inside it, the spans for its children.
 * A child starts after its parent starts and the parent ends after its last
 * child ends, so a child is never outside its parent's interval.
 */
function addSpan(
  step: Step,
  parentId: string | null,
  startMs: number,
  spans: Span[],
  fault: Fault,
  random: Random,
): Span {
  const span: Span = {
    id: `s${spans.length + 1}`,
    parentId,
    service: step.service,
    operation: step.operation,
    startMs,
    durationMs: 0,
    status: step === fault.failingStep ? 'error' : 'ok',
  };
  spans.push(span);

  let work = randomInt(random, ...step.work) * fault.workFactor;
  if (step === fault.slowStep) {
    work += fault.slowExtraMs;
  }
  // Half of the step's own work happens before its children, half after.
  const workBefore = Math.floor(work / 2);

  let nextChildStart = startMs + workBefore;
  let childrenEnd = nextChildStart;

  for (const childStep of step.children ?? []) {
    const child = addSpan(
      childStep,
      span.id,
      nextChildStart,
      spans,
      fault,
      random,
    );
    childrenEnd = Math.max(childrenEnd, child.startMs + child.durationMs);

    const failed = child.status === 'error' && !childStep.optional;
    if (failed) {
      span.status = 'error';
    }
    if (!step.parallel) {
      if (failed) {
        break; // The caller gives up at the first failure.
      }
      nextChildStart = childrenEnd + 1;
    }
  }

  span.durationMs = childrenEnd + (work - workBefore) - startMs;
  return span;
}

function generateSpans(random: Random, startedAtMs: number): Span[] {
  const template = pick(random, TEMPLATES);
  if (!template) {
    return [];
  }
  const spans: Span[] = [];
  const fault = chooseFault(random, template, inIncident(startedAtMs));
  addSpan(template, null, 0, spans, fault, random);
  return spans;
}

// ---------------------------------------------------------------------------
// Hand-written traces
// ---------------------------------------------------------------------------

interface FixedSpan {
  service: string;
  operation: string;
  /** Start and end, as offsets from the start of the trace in ms. */
  from: number;
  to: number;
  failed?: boolean;
  children?: FixedSpan[];
}

interface FixedTrace {
  id: string;
  minutesAgo: number;
  root: FixedSpan;
}

const FIXED_TRACES: FixedTrace[] = [
  // Slow, and one query is 78% of the time (2,262 of 2,900 ms).
  {
    id: SEEDED_TRACE_IDS.slowQuery,
    minutesAgo: 2,
    root: {
      service: 'api-gateway',
      operation: 'GET /orders',
      from: 0,
      to: 2900,
      children: [
        {
          service: 'auth',
          operation: 'verify token',
          from: 5,
          to: 41,
          children: [
            { service: 'redis', operation: 'GET session', from: 9, to: 13 },
          ],
        },
        {
          service: 'orders',
          operation: 'list orders',
          from: 48,
          to: 2890,
          children: [
            {
              service: 'postgres',
              operation: 'SELECT orders WHERE user_id = ?',
              from: 60,
              to: 2322,
            },
            {
              service: 'postgres',
              operation: 'SELECT order_items WHERE order_id IN (?)',
              from: 2330,
              to: 2378,
            },
            {
              service: 'inventory',
              operation: 'POST /stock/lookup',
              from: 2390,
              to: 2610,
              children: [
                {
                  service: 'postgres',
                  operation: 'SELECT stock WHERE sku IN (?)',
                  from: 2400,
                  to: 2590,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  // Failed, on one path: gateway, orders, payments, the card acquirer call.
  {
    id: SEEDED_TRACE_IDS.error,
    minutesAgo: 6,
    root: {
      service: 'api-gateway',
      operation: 'POST /checkout',
      from: 0,
      to: 640,
      failed: true,
      children: [
        {
          service: 'auth',
          operation: 'verify token',
          from: 4,
          to: 30,
          children: [
            { service: 'redis', operation: 'GET session', from: 8, to: 12 },
          ],
        },
        {
          service: 'orders',
          operation: 'create order',
          from: 36,
          to: 632,
          failed: true,
          children: [
            {
              service: 'postgres',
              operation: 'INSERT orders',
              from: 44,
              to: 70,
            },
            {
              service: 'inventory',
              operation: 'reserve stock',
              from: 76,
              to: 150,
              children: [
                {
                  service: 'postgres',
                  operation: 'UPDATE stock SET reserved = ?',
                  from: 84,
                  to: 140,
                },
              ],
            },
            {
              service: 'payments',
              operation: 'charge card',
              from: 156,
              to: 610,
              failed: true,
              children: [
                {
                  service: 'postgres',
                  operation: 'SELECT payment_methods WHERE user_id = ?',
                  from: 162,
                  to: 180,
                },
                {
                  service: 'payments',
                  operation: 'POST card-acquirer /authorize',
                  from: 186,
                  to: 600,
                  failed: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },
  // Slow, but the largest step is only 18% of the time (296 of 1,640 ms).
  {
    id: SEEDED_TRACE_IDS.uncertain,
    minutesAgo: 11,
    root: {
      service: 'api-gateway',
      operation: 'GET /products/search',
      from: 0,
      to: 1640,
      children: [
        {
          service: 'auth',
          operation: 'verify token',
          from: 10,
          to: 190,
          children: [
            { service: 'redis', operation: 'GET session', from: 20, to: 130 },
          ],
        },
        {
          service: 'catalog',
          operation: 'search products',
          from: 200,
          to: 1620,
          children: [
            {
              service: 'redis',
              operation: 'GET search:cache',
              from: 210,
              to: 400,
            },
            {
              service: 'postgres',
              operation: 'SELECT products WHERE name ILIKE ?',
              from: 410,
              to: 706,
            },
            {
              service: 'postgres',
              operation: 'SELECT prices WHERE product_id IN (?)',
              from: 710,
              to: 960,
            },
            {
              service: 'inventory',
              operation: 'POST /stock/lookup',
              from: 970,
              to: 1380,
              children: [
                {
                  service: 'postgres',
                  operation: 'SELECT stock WHERE sku IN (?)',
                  from: 985,
                  to: 1260,
                },
              ],
            },
            {
              service: 'redis',
              operation: 'SET search:cache',
              from: 1390,
              to: 1590,
            },
          ],
        },
      ],
    },
  },
];

function addFixedSpan(
  fixed: FixedSpan,
  parentId: string | null,
  spans: Span[],
) {
  const span: Span = {
    id: `s${spans.length + 1}`,
    parentId,
    service: fixed.service,
    operation: fixed.operation,
    startMs: fixed.from,
    durationMs: fixed.to - fixed.from,
    status: fixed.failed ? 'error' : 'ok',
  };
  spans.push(span);
  for (const child of fixed.children ?? []) {
    addFixedSpan(child, span.id, spans);
  }
}

// ---------------------------------------------------------------------------
// The dataset
// ---------------------------------------------------------------------------

/** The list row for a trace is derived from its root span, the first one. */
function summarise(
  id: string,
  startedAtMs: number,
  spans: Span[],
): TraceSummary | undefined {
  const root = spans[0];
  if (!root) {
    return undefined;
  }
  return {
    id,
    service: root.service,
    operation: root.operation,
    startedAt: new Date(startedAtMs).toISOString(),
    durationMs: root.durationMs,
    status: root.status,
    spanCount: spans.length,
  };
}

export function createDataset(seed = 2026, generatedCount = 500): Dataset {
  const random = createRandom(seed);
  const traces: TraceSummary[] = [];
  const spansByTraceId = new Map<string, Span[]>();

  function add(id: string, startedAtMs: number, spans: Span[]) {
    const trace = summarise(id, startedAtMs, spans);
    if (trace) {
      traces.push(trace);
      spansByTraceId.set(id, spans);
    }
  }

  for (const fixed of FIXED_TRACES) {
    const spans: Span[] = [];
    addFixedSpan(fixed.root, null, spans);
    add(fixed.id, SEED_NOW - fixed.minutesAgo * MINUTE, spans);
  }

  // Generated traces are spread over the day before the hand-written ones.
  for (let i = 0; i < generatedCount; i++) {
    const id = randomHex(random) + randomHex(random);
    const startedAtMs = SEED_NOW - 15 * MINUTE - randomInt(random, 0, DAY);
    add(id, startedAtMs, generateSpans(random, startedAtMs));
  }

  traces.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return { traces, spansByTraceId };
}
