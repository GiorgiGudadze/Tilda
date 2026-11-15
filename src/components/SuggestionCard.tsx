import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SuggestionCardProps {
  /** The heading of the card, such as "Suggested cause". */
  title: string;
  /**
   * A suggestion is something to review, so its card has a dashed frame.
   * A decided card has a solid one.
   */
  variant: 'suggestion' | 'decided';
  /** The id of the heading, for `aria-labelledby` on a wrapping section. */
  titleId?: string;
  children: ReactNode;
  className?: string;
}

/**
 * The frame around a suggested or recorded cause. The dashed frame and the
 * sparkle say "written by the AI, not decided yet" without relying on
 * colour.
 */
export function SuggestionCard({
  title,
  variant,
  titleId,
  children,
  className,
}: SuggestionCardProps) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border bg-card p-4 text-sm text-card-foreground',
        variant === 'suggestion' && 'border-dashed border-input',
        className,
      )}
    >
      <h2
        id={titleId}
        className="flex items-center gap-1.5 text-base font-semibold"
      >
        {variant === 'suggestion' && (
          <Sparkles aria-hidden="true" className="size-4 shrink-0" />
        )}
        {title}
      </h2>
      {children}
    </div>
  );
}
