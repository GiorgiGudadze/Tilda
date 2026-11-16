import { createParser } from 'nuqs';
import { isBound } from '@/lib/time-range';

/**
 * A time bound in the URL, kept as written (`now-6h`). One that is not a
 * time counts as absent. The traces and services pages both use it.
 */
export const parseAsBound = createParser({
  parse: (value) => (isBound(value) ? value : null),
  serialize: (value: string) => value,
});
