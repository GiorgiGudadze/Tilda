import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title: string;
  description?: string;
  /** Shows a Retry button when given. */
  onRetry?: () => void;
  className?: string;
}

/** Shown where something failed to load. It is announced to screen readers. */
export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border px-6 py-10 text-center',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="size-6 text-destructive" />
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
