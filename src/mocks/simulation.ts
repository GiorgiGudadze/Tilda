/**
 * What the "Simulate" control in the header picks. It changes how the mock
 * API answers, so the loading, error and empty states can be seen on demand.
 */
export const SIMULATIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow responses' },
  { value: 'error', label: 'Server errors' },
  { value: 'empty', label: 'No data' },
] as const;

export type Simulation = (typeof SIMULATIONS)[number]['value'];

let current: Simulation = 'normal';

export function getSimulation(): Simulation {
  return current;
}

export function setSimulation(next: Simulation) {
  current = next;
}
