/**
 * A trace counts as slow when it took this long or longer.
 *
 * This is an assumption, kept in one place. A real system would compare a
 * request with the normal time for its operation, not with one fixed number.
 */
export const SLOW_THRESHOLD_MS = 1000;
