import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { SelectMenu } from '@/components/SelectMenu';
import {
  getSimulation,
  setSimulation,
  type Simulation,
  SIMULATIONS,
} from '@/mocks/simulation';

/**
 * Lets a visitor see the loading, error and empty states on demand: the
 * button reads "Simulate: Server errors". What it picks belongs to the mock
 * API. This control sets it and loads every query again.
 */
export function SimulateControl() {
  const id = useId();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(getSimulation);

  function change(next: Simulation) {
    setSimulation(next);
    setValue(next);
    // Drop what is cached, so each page shows its state from the start.
    void queryClient.resetQueries();
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <label htmlFor={id}>Simulate</label>
      <SelectMenu
        id={id}
        label="Simulate"
        value={value}
        options={[...SIMULATIONS]}
        onChange={change}
        // It sits at the right edge of the header, so its list opens leftwards.
        align="end"
        className="w-40"
      />
    </div>
  );
}
