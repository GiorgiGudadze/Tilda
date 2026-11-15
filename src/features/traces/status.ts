import type { Status } from '@/features/traces/schemas';

export const STATUS_LABELS: Record<Status, string> = {
  ok: 'OK',
  error: 'Error',
};
