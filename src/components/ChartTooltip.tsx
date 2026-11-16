import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChartTooltipProps {
  /**
   * Where the tooltip points, as CSS lengths from the top left of the
   * nearest positioned box. `null` hides it.
   */
  at: { left: string; top: string } | null;
  children: ReactNode;
}

/**
 * One tooltip for a whole chart, moved to the mark under the pointer.
 *
 * A chart has hundreds of marks; one tooltip each would be hundreds of
 * Radix roots. Instead an empty, invisible point is placed where the mark
 * is, and the tooltip opens on it. The chart decides when it shows, so it
 * can hide it while a drag is on.
 */
export function ChartTooltip({ at, children }: ChartTooltipProps) {
  return (
    <Tooltip open={at !== null}>
      <TooltipTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-0"
          style={at ?? { left: 0, top: 0 }}
        />
      </TooltipTrigger>
      {/* It never takes the pointer, so the marks below stay hoverable. */}
      <TooltipContent inline side="top" className="pointer-events-none">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
