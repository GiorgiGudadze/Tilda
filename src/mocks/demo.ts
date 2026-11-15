/**
 * The "Demo" control in the header. It changes how the mock API answers, so
 * the loading, error and empty states can be seen on demand.
 */
export const DEMO_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow responses' },
  { value: 'error', label: 'Server errors' },
  { value: 'empty', label: 'No data' },
] as const;

export type DemoMode = (typeof DEMO_MODES)[number]['value'];

let mode: DemoMode = 'normal';

export function getDemoMode(): DemoMode {
  return mode;
}

export function setDemoMode(next: DemoMode) {
  mode = next;
}
