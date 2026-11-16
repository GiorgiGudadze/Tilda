import { Link } from 'react-router';
import { ServiceIcon } from '@/components/ServiceIcon';
import { serviceHref } from '@/features/services/filters';
import type { Dependency } from '@/features/services/schemas';
import { formatShare } from '@/lib/format';
import type { TimeRange } from '@/lib/time-range';
import { serviceColor, serviceIcon } from '@/lib/known-services';

interface DependencyListProps {
  /** As "Called by" or "Calls". */
  title: string;
  /** What an empty list says, as "Nothing calls it." */
  empty: string;
  items: Dependency[];
  range: TimeRange | null;
}

/**
 * The services on one side of this one, each with how many calls went
 * between them and how many of those failed. Each name opens that service.
 */
export function DependencyList({
  title,
  empty,
  items,
  range,
}: DependencyListProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {items.map((item) => (
            <li
              key={item.service}
              className="flex items-center gap-3 px-3 py-2"
            >
              <ServiceIcon
                icon={serviceIcon(item.service)}
                color={serviceColor(item.service)}
              />
              <Link
                to={serviceHref(item.service, range)}
                className="min-w-0 flex-1 truncate font-medium underline underline-offset-4"
              >
                {item.service}
              </Link>
              <span className="tabular-nums text-muted-foreground">
                {`${item.calls} ${item.calls === 1 ? 'call' : 'calls'}`}
              </span>
              <span className="min-w-24 text-right tabular-nums whitespace-nowrap">
                {item.failed === 0
                  ? 'none failed'
                  : `${formatShare(item.failed, item.calls)} failed`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
