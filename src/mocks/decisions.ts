import {
  type Decision,
  type TraceDecision,
  traceDecisionListSchema,
} from '@/features/suggestion/schemas';

/**
 * Where the mock API keeps decisions: in the browser's localStorage, so they
 * survive a reload. A real server would keep them in a database.
 */
const STORAGE_KEY = 'trace-investigator:decisions';

/** Newest first. Anything unreadable in storage counts as no decisions. */
export function readDecisions(): TraceDecision[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = traceDecisionListSchema.safeParse(JSON.parse(raw ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function writeDecisions(list: TraceDecision[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Stores the decision about a trace, in place of any earlier one. A changed
 * decision keeps its place in the list; a new one goes first.
 */
export function putDecision(traceId: string, decision: Decision) {
  const list = readDecisions();
  const saved: TraceDecision = { traceId, decision };
  writeDecisions(
    list.some((item) => item.traceId === traceId)
      ? list.map((item) => (item.traceId === traceId ? saved : item))
      : [saved, ...list],
  );
  return saved;
}
