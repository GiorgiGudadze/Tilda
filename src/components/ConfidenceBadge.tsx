import { SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVELS = {
  high: { label: 'High confidence', Icon: SignalHigh },
  medium: { label: 'Medium confidence', Icon: SignalMedium },
  low: { label: 'Low confidence', Icon: SignalLow },
};

interface ConfidenceBadgeProps {
  confidence: keyof typeof LEVELS;
  /** What the confidence is based on, such as "78% of trace time". */
  basis?: string | null;
  className?: string;
}

/**
 * How sure a suggestion is, as an icon plus words, with the reason beside
 * it. It is not coloured: confidence is not a status, and a green "high"
 * would read as "correct".
 */
export function ConfidenceBadge({
  confidence,
  basis,
  className,
}: ConfidenceBadgeProps) {
  const { label, Icon } = LEVELS[confidence];
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2', className)}>
      <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </span>
      {basis && (
        <span className="text-muted-foreground">Based on: {basis}</span>
      )}
    </p>
  );
}
