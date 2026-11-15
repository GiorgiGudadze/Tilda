import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUSES = {
  ok: { label: 'OK', Icon: CircleCheck, className: 'text-success' },
  error: { label: 'Error', Icon: CircleAlert, className: 'text-destructive' },
};

interface StatusBadgeProps {
  status: keyof typeof STATUSES;
  /** Replaces the default text, "OK" or "Error". */
  label?: string;
  className?: string;
}

/** A status as an icon plus text, so it never depends on colour alone. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { Icon, ...config } = STATUSES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium whitespace-nowrap',
        config.className,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {label ?? config.label}
    </span>
  );
}
