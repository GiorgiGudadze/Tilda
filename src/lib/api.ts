import type { z } from 'zod';
import { createLineSplitter } from '@/lib/json-lines';

/** A response with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** GET a JSON resource and check its shape. A wrong shape throws a ZodError. */
export async function getJson<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return schema.parse(await response.json());
}

/** PUT a JSON body and check the shape of the answer. */
export async function putJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return schema.parse(await response.json());
}

/**
 * POST, then read the answer as a stream of JSON lines. `onEvent` is called
 * for each line as it arrives, after its shape is checked. The promise
 * resolves when the stream ends, and rejects on a bad status, a line that
 * is not valid, or `signal` being aborted.
 */
export async function postJsonLines<T>(
  path: string,
  schema: z.ZodType<T>,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(path, { method: 'POST', signal });
  if (!response.ok || !response.body) {
    throw new ApiError(response.status);
  }

  const reader = response.body.getReader();
  // `stream: true` keeps a character that is cut in two between chunks.
  const decoder = new TextDecoder();
  const lines = createLineSplitter();
  const emit = (line: string) => onEvent(schema.parse(JSON.parse(line)));

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    lines.push(decoder.decode(value, { stream: true })).forEach(emit);
  }
  lines.end().forEach(emit);
}
