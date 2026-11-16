import { ExternalLink } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Link } from 'react-router';
import { PageHeading } from '@/app/PageHeading';
import { Combobox, type ComboboxOption } from '@/components/Combobox';
import { ErrorState } from '@/components/ErrorState';
import { Field } from '@/components/Field';
import { ServiceIcon } from '@/components/ServiceIcon';
import { Skeleton } from '@/components/Skeleton';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { Button } from '@/components/ui/button';
import {
  rangeOf,
  tracesHref,
  useServiceFilters,
} from '@/features/services/filters';
import { ServiceHealth } from '@/features/services/ServiceHealth';
import { useServices } from '@/features/traces/hooks';
import { serviceColor, serviceIcon } from '@/lib/known-services';

/**
 * The health of one service over a time range: how it is doing, who calls
 * it, and its traces. With no service in the address, the first one.
 */
export function ServicesPage() {
  const id = useId();
  const { filters, setFilters } = useServiceFilters();
  const { data: services, isPending, refetch } = useServices();
  const range = rangeOf(filters);

  // The service in the URL stays selectable while the list loads, and when
  // the link names a service that does not exist.
  const known = services ?? [];
  const service = filters.service || known[0] || '';
  const options: ComboboxOption[] = (
    service && !known.includes(service) ? [service, ...known] : known
  ).map((name) => ({
    value: name,
    label: name,
    icon: <ServiceIcon icon={serviceIcon(name)} color={serviceColor(name)} />,
  }));

  let content: ReactNode;
  if (isPending && !service) {
    content = (
      <>
        <p className="sr-only">Loading services…</p>
        <Skeleton className="h-28 w-full" />
      </>
    );
  } else if (!services && !service) {
    content = (
      <ErrorState
        title="The services could not be loaded"
        onRetry={() => refetch()}
      />
    );
  } else {
    content = (
      <ServiceHealth
        service={service}
        range={range}
        // A zoom is a step the user may want to undo, so it gets its own
        // entry in the browser's history.
        onZoom={(next) => setFilters(next, { push: true })}
      />
    );
  }

  return (
    <>
      <PageHeading title="Services" />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Service" htmlFor={`${id}-service`} className="w-56">
          <Combobox
            id={`${id}-service`}
            label="Service"
            value={service}
            options={options}
            onChange={(next) => setFilters({ service: next }, { push: true })}
            searchPlaceholder="Search services"
            disabled={isPending}
          />
        </Field>
        <Field label="Time" htmlFor={`${id}-time`}>
          <TimeRangePicker
            id={`${id}-time`}
            value={range}
            onChange={(next) =>
              setFilters(
                { from: next?.from ?? null, to: next?.to ?? null },
                { push: true },
              )
            }
            side="bottom"
          />
        </Field>
        {service && (
          <Button asChild variant="outline" className="sm:ml-auto">
            <Link to={tracesHref(service, range)}>
              <ExternalLink aria-hidden="true" />
              Traces through {service}
            </Link>
          </Button>
        )}
      </div>

      {content}
    </>
  );
}
