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

/** The same colours as text, for an icon drawn in the service's colour. */
export const SERVICE_TEXT: Record<ServiceColor, string> = {
  1: 'text-service-1',
  2: 'text-service-2',
  3: 'text-service-3',
  4: 'text-service-4',
  5: 'text-service-5',
  6: 'text-service-6',
  7: 'text-service-7',
  8: 'text-service-8',
  other: 'text-service-other',
};
