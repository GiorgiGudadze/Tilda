import {
  SERVICE_BACKGROUNDS,
  type ServiceColor,
} from '@/components/service-colors';
import { cn } from '@/lib/utils';

interface ServiceLabelProps {
  name: string;
  color: ServiceColor;
  className?: string;
}

/** A service name with its colour beside it. The name is always there as text. */
export function ServiceLabel({ name, color, className }: ServiceLabelProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 shrink-0 rounded-xs',
          SERVICE_BACKGROUNDS[color],
        )}
      />
      <span className="font-medium">{name}</span>
    </span>
  );
}
