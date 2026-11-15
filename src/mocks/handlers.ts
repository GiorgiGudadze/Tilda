import { delay, http, HttpResponse } from 'msw';
import type { TraceDetail, TraceList } from '@/features/traces/schemas';
import { createDataset } from '@/mocks/seed';

const PAGE_SIZE = 25;

const dataset = createDataset();

/** A real API is never instant. Tests skip the wait. */
function latency() {
  return delay(import.meta.env.MODE === 'test' ? 0 : 200 + Math.random() * 600);
}

export const handlers = [
  http.get('/api/traces', async () => {
    await latency();
    const body: TraceList = {
      items: dataset.traces.slice(0, PAGE_SIZE),
      total: dataset.traces.length,
    };
    return HttpResponse.json(body);
  }),

  http.get('/api/traces/:id', async ({ params }) => {
    await latency();
    const trace = dataset.traces.find((item) => item.id === params.id);
    const spans = dataset.spansByTraceId.get(String(params.id));
    if (!trace || !spans) {
      return new HttpResponse(null, { status: 404 });
    }
    const body: TraceDetail = { trace, spans };
    return HttpResponse.json(body);
  }),
];
