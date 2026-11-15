import { delay, http, HttpResponse } from 'msw';
import { pinChangesSchema, type Pin } from '@/features/investigation/schemas';
import type { SuggestionEvent } from '@/features/suggestion/schemas';
import { countBuckets } from '@/features/traces/duration-buckets';
import {
  traceListParamsSchema,
  type TraceDetail,
  type TraceList,
} from '@/features/traces/schemas';
import { getDemoMode } from '@/mocks/demo';
import { deletePin, putPin, readPins, type StoredPin } from '@/mocks/pins';
import { listServices, queryTraces } from '@/mocks/query-traces';
import { createDataset } from '@/mocks/seed';
import { suggestCause } from '@/mocks/suggest';

const dataset = createDataset();

const EMPTY_LIST: TraceList = {
  items: [],
  total: 0,
  buckets: countBuckets([]),
};

/** A real API is never instant. Tests skip the wait. */
function latency() {
  if (import.meta.env.MODE === 'test') {
    return delay(0);
  }
  return delay(getDemoMode() === 'slow' ? 3000 : 200 + Math.random() * 600);
}

/** The wait between two pieces of a streamed answer. Tests skip it. */
function streamPause() {
  if (import.meta.env.MODE === 'test') {
    return delay(0);
  }
  return delay(getDemoMode() === 'slow' ? 250 : 50);
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

/** The answer of every endpoint while the Demo control is set to errors. */
function demoError() {
  return getDemoMode() === 'error'
    ? new HttpResponse(null, { status: 500 })
    : undefined;
}

/** Adds the trace summary to a stored pin. A pin of a missing trace is dropped. */
function withTrace(pin: StoredPin): Pin | undefined {
  const trace = dataset.traces.find((item) => item.id === pin.traceId);
  return trace ? { ...pin, trace } : undefined;
}

export const handlers = [
  http.get('/api/traces', async ({ request }) => {
    await latency();
    const failure = demoError();
    if (failure) {
      return failure;
    }

    const query = Object.fromEntries(new URL(request.url).searchParams);
    const params = traceListParamsSchema.safeParse(query);
    if (!params.success) {
      return new HttpResponse(null, { status: 400 });
    }

    const body =
      getDemoMode() === 'empty'
        ? EMPTY_LIST
        : queryTraces(dataset, params.data);
    return HttpResponse.json(body);
  }),

  http.get('/api/traces/:id', async ({ params }) => {
    await latency();
    const failure = demoError();
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
    const failure = demoError();
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

  http.get('/api/investigation', async () => {
    await latency();
    const failure = demoError();
    if (failure) {
      return failure;
    }
    const pins =
      getDemoMode() === 'empty'
        ? []
        : readPins()
            .map(withTrace)
            .filter((pin) => pin !== undefined);
    return HttpResponse.json(pins);
  }),

  http.put('/api/investigation/:traceId', async ({ params, request }) => {
    await latency();
    const failure = demoError();
    if (failure) {
      return failure;
    }

    const changes = pinChangesSchema.safeParse(await request.json());
    if (!changes.success) {
      return new HttpResponse(null, { status: 400 });
    }
    const traceId = String(params.traceId);
    if (!dataset.spansByTraceId.has(traceId)) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(withTrace(putPin(traceId, changes.data)));
  }),

  http.delete('/api/investigation/:traceId', async ({ params }) => {
    await latency();
    const failure = demoError();
    if (failure) {
      return failure;
    }
    deletePin(String(params.traceId));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/services', async () => {
    await latency();
    return demoError() ?? HttpResponse.json(listServices(dataset));
  }),
];
