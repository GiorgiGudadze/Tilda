import type { LucideIcon } from 'lucide-react';
import { SERVICE_TEXT, type ServiceColor } from '@/components/service-colors';
import { cn } from '@/lib/utils';

interface ServiceIconProps {
  icon: LucideIcon;
  color: ServiceColor;
  className?: string;
}

/**
 * A service's icon, drawn in the service's colour. It is decoration: the
 * service name is always beside it as text.
 */
export function ServiceIcon({
  icon: Icon,
  color,
  className,
}: ServiceIconProps) {
  return (
    <Icon
      aria-hidden="true"
      className={cn('size-4 shrink-0', SERVICE_TEXT[color], className)}
    />
  );
}
