import {
  BookOpen,
  Box,
  Boxes,
  CreditCard,
  Database,
  KeyRound,
  type LucideIcon,
  ShoppingCart,
  Waypoints,
  Zap,
} from 'lucide-react';
import type { ServiceColor } from '@/components/service-colors';

/*
 * The services the demo knows, each with a fixed colour and icon, so a
 * service looks the same on every page.
 */

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

/**
 * Each known service has a fixed icon that hints at what it does. A service
 * that is not listed gets a plain box.
 */
const ICONS = new Map<string, LucideIcon>([
  ['api-gateway', Waypoints],
  ['auth', KeyRound],
  ['catalog', BookOpen],
  ['inventory', Boxes],
  ['orders', ShoppingCart],
  ['payments', CreditCard],
  ['postgres', Database],
  ['redis', Zap],
]);

export function serviceIcon(service: string): LucideIcon {
  return ICONS.get(service) ?? Box;
}
