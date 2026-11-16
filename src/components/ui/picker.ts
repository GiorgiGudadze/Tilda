/**
 * The look shared by the app's own dropdowns (`Combobox` with a search box,
 * `SelectMenu` without), so they read as one kind of control.
 */

/** The button that shows the chosen value and opens the list. */
export const PICKER_TRIGGER =
  'flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-2 text-left text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

/**
 * One choice in the list. cmdk marks the highlighted choice with
 * `data-selected`, Radix with `data-highlighted`; both look the same.
 */
export const PICKER_ITEM =
  'flex h-8 items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground';
