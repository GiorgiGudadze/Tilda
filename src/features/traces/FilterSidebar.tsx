import { Funnel } from 'lucide-react';
import { useId, useState } from 'react';
import { DurationRangeInput } from '@/components/DurationRangeInput';
import { FacetChecklist } from '@/components/FacetChecklist';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { Button } from '@/components/ui/button';
import {
  type FilterChangeOptions,
  rangeOf,
  type TraceFilters,
} from '@/features/traces/filters';
import type { TraceList } from '@/features/traces/schemas';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';

type SidebarFilters = Pick<
  TraceFilters,
  'name' | 'minMs' | 'maxMs' | 'from' | 'to'
>;

interface FilterSidebarProps {
  filters: SidebarFilters;
  /** The latest list response, for the counts. Missing while it loads. */
  list: TraceList | undefined;
  onChange: (
    patch: Partial<SidebarFilters>,
    options?: FilterChangeOptions,
  ) => void;
}

const STORAGE_KEY = 'trace-investigator:filters-open';

/** The saved choice, if there is one and storage can be read. */
function readSavedOpen(): boolean | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? null : saved === 'true';
  } catch {
    return null;
  }
}

function saveOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // Storage can be blocked. The sidebar still works, it just forgets.
  }
}

/**
 * The filters by request name, duration and time. Name is a checklist with
 * counts and a search box, duration a min and a max in milliseconds, and time a range picker.
 *
 * On a wide screen it sits to the left of the list and folds into a narrow
 * strip; the choice is remembered. On a narrow screen it is a "Filters"
 * button above the list, closed at first. Either way, a closed sidebar says
 * how many of its filters are on, so a hidden filter is never forgotten.
 */
export function FilterSidebar({ filters, list, onChange }: FilterSidebarProps) {
  const isWide = useMediaQuery('(min-width: 1024px)');
  const [open, setOpen] = useState(() => isWide && (readSavedOpen() ?? true));
  const panelId = useId();

  // The two duration fields are one filter.
  const hasDuration = filters.minMs !== null || filters.maxMs !== null;
  const range = rangeOf(filters);
  const active = [filters.name.length > 0, hasDuration, range].filter(
    Boolean,
  ).length;

  function toggle() {
    setOpen(!open);
    if (isWide) {
      saveOpen(!open);
    }
  }

  // The names in the URL stay listed, and can be unchecked, while the list
  // loads and when a link names one that does not exist.
  const names = list?.facets.names ?? [];
  const unknown = filters.name
    .filter((name) => !names.some((item) => item.name === name))
    .map((name) => ({ name, count: undefined }));
  const nameOptions = [...unknown, ...names];

  const panel = (
    <div id={panelId} className="space-y-5">
      <FacetChecklist
        label="Name"
        searchNoun="names"
        values={filters.name}
        options={nameOptions.map((item) => ({
          value: item.name,
          label: item.name,
          count: item.count,
        }))}
        onChange={(name) => onChange({ name })}
      />
      <DurationRangeInput
        label="Duration"
        value={{ minMs: filters.minMs, maxMs: filters.maxMs }}
        onChange={onChange}
      />
      <div className="space-y-1">
        <label
          htmlFor={`${panelId}-time`}
          className="block px-2 text-xs font-medium text-muted-foreground"
        >
          Time
        </label>
        <div className="px-2">
          <TimeRangePicker
            id={`${panelId}-time`}
            value={range}
            // Beside the sidebar there is room. Below it, often not.
            side={isWide ? 'right' : 'bottom'}
            onChange={(next) =>
              // A new time range is a step Back can undo, as a zoom is.
              onChange(
                { from: next?.from ?? null, to: next?.to ?? null },
                { push: true },
              )
            }
          />
        </div>
      </div>
    </div>
  );

  if (!isWide) {
    return (
      <section aria-label="More filters" className="space-y-3">
        <Button
          variant="outline"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <Funnel aria-hidden="true" />
          {active > 0 ? `Filters (${active} on)` : 'Filters'}
        </Button>
        {open && panel}
      </section>
    );
  }

  return (
    <aside
      aria-label="More filters"
      className={cn('sticky top-4 shrink-0 space-y-3', open ? 'w-56' : 'w-9')}
    >
      {/* The filter row beside it has a label above each field. Starting
          that label's height (16 px) and gap (4 px) lower puts this row
          level with the search box, not with its label. */}
      <div className="mt-5 flex items-center justify-between gap-2">
        {open && <h2 className="px-2 text-sm font-semibold">Filters</h2>}
        <Button
          variant="outline"
          size="icon"
          // A toggle: outlined while the filters are hidden, filled while
          // they are shown.
          className="border-primary aria-expanded:bg-primary aria-expanded:text-primary-foreground aria-expanded:hover:bg-primary/85 aria-expanded:hover:text-primary-foreground"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            open
              ? 'Hide filters'
              : `Show filters${active > 0 ? `, ${active} on` : ''}`
          }
          title={open ? 'Hide filters' : 'Show filters'}
          onClick={toggle}
        >
          <Funnel aria-hidden="true" />
        </Button>
      </div>
      {!open && active > 0 && (
        <span
          aria-hidden="true"
          className="mx-auto flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {active}
        </span>
      )}
      {open && panel}
    </aside>
  );
}
