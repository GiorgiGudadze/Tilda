/** A slot in the service palette. `other` is the neutral fallback. */
export type ServiceColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'other';

export const SERVICE_COLORS: ServiceColor[] = [1, 2, 3, 4, 5, 6, 7, 8, 'other'];

// Full class names, so Tailwind can find them in the source.
export const SERVICE_BACKGROUNDS: Record<ServiceColor, string> = {
  1: 'bg-service-1',
  2: 'bg-service-2',
  3: 'bg-service-3',
  4: 'bg-service-4',
  5: 'bg-service-5',
  6: 'bg-service-6',
  7: 'bg-service-7',
  8: 'bg-service-8',
  other: 'bg-service-other',
};
