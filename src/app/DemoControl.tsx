import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Select } from '@/components/ui/select';
import {
  DEMO_MODES,
  type DemoMode,
  getDemoMode,
  setDemoMode,
} from '@/mocks/demo';

/**
 * Lets a visitor see the loading, error and empty states on demand. The mode
 * belongs to the mock API. This control sets it and loads every query again.
 */
export function DemoControl() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(getDemoMode);

  function change(next: DemoMode) {
    setDemoMode(next);
    setMode(next);
    // Drop what is cached, so each page shows its state from the start.
    void queryClient.resetQueries();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Demo
      <Select
        value={mode}
        className="w-auto"
        onChange={(event) => {
          const next = DEMO_MODES.find(
            (item) => item.value === event.target.value,
          );
          if (next) {
            change(next.value);
          }
        }}
      >
        {DEMO_MODES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
