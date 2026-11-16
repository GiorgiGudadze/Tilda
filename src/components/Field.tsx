import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  /** The `id` of the control inside. */
  htmlFor: string;
  className?: string;
  children: ReactNode;
}

/** A control with its label above it. */
export function Field({ label, htmlFor, className, children }: FieldProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
