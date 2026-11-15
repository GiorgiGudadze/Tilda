import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Usually one button, such as "Clear filters". */
  action?: ReactNode;
  className?: string;
}

/** Shown where a list or a panel has nothing to show. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
