import { z } from 'zod';
import {
  NEW_PIN,
  type PinChanges,
  pinFieldsSchema,
} from '@/features/investigation/schemas';

/**
 * Where the mock API keeps pins: in the browser's localStorage, so they
 * survive a reload. A real server would keep them in a database.
 */
const STORAGE_KEY = 'trace-investigator:pins';

/** A pin as it is stored: without the trace summary, which is joined on read. */
const storedPinSchema = pinFieldsSchema.extend({ traceId: z.string() });
export type StoredPin = z.infer<typeof storedPinSchema>;

/** Newest first. Anything unreadable in storage counts as no pins. */
export function readPins(): StoredPin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = z.array(storedPinSchema).safeParse(JSON.parse(raw ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writePins(pins: StoredPin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

/**
 * Creates the pin, or changes the fields named in `changes` and leaves the
 * rest as they are. An existing pin keeps its place in the list.
 */
export function putPin(traceId: string, changes: PinChanges): StoredPin {
  const pins = readPins();
  const existing = pins.find((item) => item.traceId === traceId);
  const pin: StoredPin = { ...NEW_PIN, ...existing, ...changes, traceId };
  writePins(
    existing
      ? pins.map((item) => (item.traceId === traceId ? pin : item))
      : [pin, ...pins],
  );
  return pin;
}

export function deletePin(traceId: string) {
  writePins(readPins().filter((item) => item.traceId !== traceId));
}
