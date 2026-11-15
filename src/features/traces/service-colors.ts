import type { ServiceColor } from '@/components/service-colors';

/**
 * Each known service has a fixed colour, so a service looks the same in every
 * trace. A service that is not listed gets the neutral colour.
 */
const COLORS = new Map<string, ServiceColor>([
  ['catalog', 1],
  ['auth', 2],
  ['inventory', 3],
  ['api-gateway', 4],
  ['postgres', 5],
  ['orders', 6],
  ['redis', 7],
  ['payments', 8],
]);

export function serviceColor(service: string): ServiceColor {
  return COLORS.get(service) ?? 'other';
}
