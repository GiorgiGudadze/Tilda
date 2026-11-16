import { Layers } from 'lucide-react';
import { useId } from 'react';
import { Combobox, type ComboboxOption } from '@/components/Combobox';
import { Field } from '@/components/Field';
import { ServiceIcon } from '@/components/ServiceIcon';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/SelectMenu';
import type { TraceFilters } from '@/features/traces/filters';
import { useServices } from '@/features/traces/hooks';
import { SORT_OPTIONS } from '@/features/traces/sort';
import { serviceColor, serviceIcon } from '@/lib/known-services';

interface TraceFilterBarProps {
  filters: TraceFilters;
  onChange: (
    patch: Partial<Pick<TraceFilters, 'q' | 'service' | 'sort'>>,
  ) => void;
}

export function TraceFilterBar({ filters, onChange }: TraceFilterBarProps) {
  const id = useId();
  const { data: services = [] } = useServices();
  // The service in the URL stays selectable while the list loads, and when
  // the link names a service that does not exist.
  const serviceOptions =
    filters.service && !services.includes(filters.service)
      ? [filters.service, ...services]
      : services;
  const serviceChoices: ComboboxOption[] = [
    {
      value: '',
      label: 'All services',
      icon: (
        <Layers
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      ),
    },
    ...serviceOptions.map((service) => ({
      value: service,
      label: service,
      icon: (
        <ServiceIcon
          icon={serviceIcon(service)}
          color={serviceColor(service)}
        />
      ),
    })),
  ];

  return (
    <form
      aria-label="Filter traces"
      // The status filter is the legend above the chart (`StatusLegend`).
      className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field
        label="Search"
        htmlFor={`${id}-search`}
        className="col-span-2 sm:col-span-1"
      >
        <Input
          id={`${id}-search`}
          type="search"
          placeholder="Operation or trace ID"
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
        />
      </Field>
      <Field label="Service" htmlFor={`${id}-service`}>
        <Combobox
          id={`${id}-service`}
          label="Service"
          value={filters.service}
          options={serviceChoices}
          onChange={(service) => onChange({ service })}
          searchPlaceholder="Search services"
        />
      </Field>
      <Field label="Sort" htmlFor={`${id}-sort`}>
        <SelectMenu
          id={`${id}-sort`}
          label="Sort"
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => onChange({ sort })}
        />
      </Field>
    </form>
  );
}
