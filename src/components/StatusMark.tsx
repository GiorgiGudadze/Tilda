import { cn } from '@/lib/utils';

/*
 * The marks the charts share: the scatter plot draws a trace with `Mark`,
 * and the status legend and the volume chart's tooltip show `StatusMark`.
 */

/**
 * How a mark is drawn: as on the plot, greyed out, or on a pressed (primary
 * coloured) legend button, where a black dot would vanish.
 */
type MarkTone = 'plot' | 'muted' | 'on-primary';

/**
 * The mark of one trace. Both are filled. A failed trace is red, and also
 * bigger with a thin ring in the page colour: red and black are too close
 * in lightness to tell apart by colour alone, and the ring keeps a red mark
 * visible where it sits on black ones.
 */
export function Mark({
  failed,
  tone = 'plot',
}: {
  failed: boolean;
  tone?: MarkTone;
}) {
  return failed ? (
    <circle
      r="4.5"
      className={cn(
        '[stroke-width:1.5] group-hover:stroke-destructive group-hover:[stroke-width:3]',
        // On the plot the ring is the page colour. On a pressed legend
        // button red is too close to the button's colour, so the ring is in
        // the button's text colour to set the mark off.
        tone === 'on-primary'
          ? 'stroke-primary-foreground'
          : 'stroke-background',
        tone === 'muted' ? 'fill-muted-foreground' : 'fill-destructive',
      )}
    />
  ) : (
    <circle
      r="3"
      className={cn(
        '[stroke-width:0] group-hover:stroke-foreground group-hover:[stroke-width:3]',
        tone === 'muted'
          ? 'fill-muted-foreground'
          : tone === 'on-primary'
            ? 'fill-primary-foreground'
            : 'fill-foreground',
      )}
    />
  );
}

/**
 * The mark of a status, as drawn on the plot, for a legend. `muted` greys it
 * out, for a status that is filtered away; `on-primary` is for a pressed
 * legend button.
 */
export function StatusMark({
  failed,
  tone = 'plot',
}: {
  failed: boolean;
  tone?: MarkTone;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-6 -6 12 12"
      className="size-3 shrink-0 overflow-visible"
    >
      <Mark failed={failed} tone={tone} />
    </svg>
  );
}
