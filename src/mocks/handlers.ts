import { delay, http, HttpResponse } from 'msw';
import { decisionSchema } from '@/features/suggestion/schemas';
import { serviceHealthParamsSchema } from '@/features/services/schemas';
import type { SuggestionEvent } from '@/features/suggestion/schemas';
import {
  traceListParamsSchema,
  tracePointsParamsSchema,
  traceVolumeParamsSchema,
  type TraceDetail,
  type TraceList,
  type TracePoints,
} from '@/features/traces/schemas';
import { putDecision, readDecisions } from '@/mocks/decisions';
import { getSimulation } from '@/mocks/simulation';
import {
  listServices,
  queryTracePoints,
  queryTraces,
  queryTraceVolume,
} from '@/mocks/query-traces';
import { queryServiceHealth } from '@/mocks/query-services';
import { createDataset } from '@/mocks/seed';
import { suggestCause } from '@/mocks/suggest';

const dataset = createDataset();

const EMPTY_LIST: TraceList = {
  items: [],
  total: 0,
  facets: { names: [] },
};

const NO_POINTS: TracePoints = { points: [], total: 0 };

const EMPTY_DATASET: typeof dataset = {
  ...dataset,
  traces: [],
  spansByTraceId: new Map(),
};

/** A real API is never instant. Tests skip the wait. */
function latency() {
  if (import.meta.env.MODE === 'test') {
    return delay(0);
  }
  return delay(getSimulation() === 'slow' ? 3000 : 200 + Math.random() * 600);
}

/** The wait between two pieces of a streamed answer. Tests skip it. */
function streamPause() {
  if (import.meta.env.MODE === 'test') {
    return delay(0);
  }
  return delay(getSimulation() === 'slow' ? 250 : 50);
}

/**
 * A suggestion as a stream of JSON lines: one `meta` line, the text a word
 * at a time, then `done`. This is how a real model answers.
 */
function streamSuggestion(events: SuggestionEvent[]): ReadableStream {
  const encoder = new TextEncoder();
  const lines = events.map((event) => `${JSON.stringify(event)}\n`);
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [index, line] of lines.entries()) {
        if (cancelled) {
          return;
        }
        if (index === 0) {
          // A network can cut a line anywhere. The first line is sent in two
          // pieces on purpose, so the reader's handling of that is always
          // exercised.
          const middle = Math.floor(line.length / 2);
          controller.enqueue(encoder.encode(line.slice(0, middle)));
          await streamPause();
          controller.enqueue(encoder.encode(line.slice(middle)));
        } else {
          controller.enqueue(encoder.encode(line));
        }
        await streamPause();
      }
      if (!cancelled) {
        controller.close();
      }
    },
    // The reader went away: the user pressed Stop or left the page.
    cancel() {
      cancelled = true;
    },
  });
}

/** The answer of every endpoint while the Simulate control is on server errors. */
function simulatedError() {
  return getSimulation() === 'error'
    ? new HttpResponse(null, { status: 500 })
    : undefined;
}

/** The query string as an object. `name` can repeat, so it stays a list. */
function queryOf(request: Request) {
  const params = new URL(request.url).searchParams;
  return { ...Object.fromEntries(params), name: params.getAll('name') };
}

export const handlers = [
  http.get('/api/traces', async ({ request }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }

    const query = queryOf(request);
    const params = traceListParamsSchema.safeParse(query);
    if (!params.success) {
      return new HttpResponse(null, { status: 400 });
    }

    const body =
      getSimulation() === 'empty'
        ? EMPTY_LIST
        : queryTraces(dataset, params.data);
    return HttpResponse.json(body);
  }),

  // Before `/api/traces/:id`, which would otherwise take "points" for an ID.
  http.get('/api/traces/points', async ({ request }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }

    const query = queryOf(request);
    const params = tracePointsParamsSchema.safeParse(query);
    if (!params.success) {
      return new HttpResponse(null, { status: 400 });
    }

    const body =
      getSimulation() === 'empty'
        ? NO_POINTS
        : queryTracePoints(dataset, params.data);
    return HttpResponse.json(body);
  }),

  // Before `/api/traces/:id` too.
  http.get('/api/traces/volume', async ({ request }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }

    const query = queryOf(request);
    const params = traceVolumeParamsSchema.safeParse(query);
    if (!params.success) {
      return new HttpResponse(null, { status: 400 });
    }

    // With no data, the chart still spans the range asked for, with empty bars.
    const body = queryTraceVolume(
      getSimulation() === 'empty' ? EMPTY_DATASET : dataset,
      params.data,
    );
    return HttpResponse.json(body);
  }),

  http.get('/api/traces/:id', async ({ params }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }

    const trace = dataset.traces.find((item) => item.id === params.id);
    const spans = dataset.spansByTraceId.get(String(params.id));
    if (!trace || !spans) {
      return new HttpResponse(null, { status: 404 });
    }
    const body: TraceDetail = { trace, spans };
    return HttpResponse.json(body);
  }),

  http.post('/api/traces/:id/suggestion', async ({ params }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }
    const spans = dataset.spansByTraceId.get(String(params.id));
    if (!spans) {
      return new HttpResponse(null, { status: 404 });
    }

    const { outcome, text } = suggestCause(spans);
    // Each word keeps the space after it, so the pieces join back exactly.
    const words = text.match(/\S+\s*/g) ?? [];
    return new HttpResponse(
      streamSuggestion([
        { type: 'meta', outcome },
        ...words.map((word) => ({ type: 'text' as const, text: word })),
        { type: 'done' },
      ]),
      { headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  }),

  http.get('/api/decisions', async () => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }
    return HttpResponse.json(
      getSimulation() === 'empty' ? [] : readDecisions(),
    );
  }),

  // A real PUT: the body is the whole decision, and it replaces any earlier
  // one for the trace.
  http.put('/api/decisions/:traceId', async ({ params, request }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }

    const decision = decisionSchema.safeParse(await request.json());
    if (!decision.success) {
      return new HttpResponse(null, { status: 400 });
    }
    const traceId = String(params.traceId);
    if (!dataset.spansByTraceId.has(traceId)) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(putDecision(traceId, decision.data));
  }),

  http.get('/api/services', async () => {
    await latency();
    return simulatedError() ?? HttpResponse.json(listServices(dataset));
  }),

  http.get('/api/services/:name/health', async ({ params, request }) => {
    await latency();
    const failure = simulatedError();
    if (failure) {
      return failure;
    }
    const name = String(params.name);
    if (!listServices(dataset).includes(name)) {
      return new HttpResponse(null, { status: 404 });
    }
    const query = serviceHealthParamsSchema.safeParse(queryOf(request));
    if (!query.success) {
      return new HttpResponse(null, { status: 400 });
    }
    // With no data, the known service still answers, with nothing in it.
    const source = getSimulation() === 'empty' ? EMPTY_DATASET : dataset;
    return HttpResponse.json(queryServiceHealth(source, name, query.data));
  }),
];
