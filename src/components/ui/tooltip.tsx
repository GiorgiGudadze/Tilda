import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Radix Tooltip, styled as shadcn styles it: dark on a light page, light on
 * a dark one. Radix places it, keeps it inside the screen and names it for
 * screen readers.
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  inline = false,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  /**
   * Render in place rather than at the end of the page. A tooltip at the end
   * of the page sits outside every landmark, which axe reports.
   */
  inline?: boolean;
}) {
  const content = (
    <TooltipPrimitive.Content
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        'z-50 max-w-72 rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background shadow-md',
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-foreground" />
    </TooltipPrimitive.Content>
  );
  return inline ? (
    content
  ) : (
    <TooltipPrimitive.Portal>{content}</TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
