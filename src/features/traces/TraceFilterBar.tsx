import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { TraceFilters } from '@/features/traces/filters';
import { useServices } from '@/features/traces/hooks';
import { sortSchema, statusSchema } from '@/features/traces/schemas';
import { cn } from '@/lib/utils';

interface TraceFilterBarProps {
  filters: TraceFilters;
  onChange: (
    patch: Partial<Pick<TraceFilters, 'q' | 'service' | 'status' | 'sort'>>,
  ) => void;
}

/** A control with its label above it. The label wraps the control. */
function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex flex-col gap-1 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {label}
      {children}
    </label>
  );
}

export function TraceFilterBar({ filters, onChange }: TraceFilterBarProps) {
  const { data: services = [] } = useServices();
  // The service in the URL stays selectable while the list loads, and when
  // the link names a service that does not exist.
  const serviceOptions =
    filters.service && !services.includes(filters.service)
      ? [filters.service, ...services]
      : services;

  return (
    <form
      aria-label="Filter traces"
      className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_10rem]"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field label="Search" className="col-span-2 sm:col-span-1">
        <Input
          type="search"
          placeholder="Operation or trace ID"
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </Field>
      <Field label="Service">
        <Select
          value={filters.service}
          onChange={(event) => onChange({ service: event.target.value })}
        >
          <option value="">All services</option>
          {serviceOptions.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select
          value={filters.status ?? ''}
          onChange={(event) =>
            onChange({
              status: statusSchema.safeParse(event.target.value).data ?? null,
            })
          }
        >
          <option value="">All statuses</option>
          <option value="ok">OK</option>
          <option value="error">Error</option>
        </Select>
      </Field>
      <Field label="Sort" className="col-span-2 sm:col-span-1">
        <Select
          value={filters.sort}
          onChange={(event) =>
            onChange({
              sort: sortSchema.safeParse(event.target.value).data ?? 'newest',
            })
          }
        >
          <option value="newest">Newest first</option>
          <option value="slowest">Slowest first</option>
        </Select>
      </Field>
    </form>
  );
}
