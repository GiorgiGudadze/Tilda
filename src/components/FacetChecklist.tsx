import { Search } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { cn } from '@/lib/utils';

export interface FacetOption {
  value: string;
  label: string;
  /** How many results this choice gives. Left out while unknown. */
  count?: number;
  icon?: ReactNode;
}

interface FacetChecklistProps {
  /** The group's name, shown above it, as "Name". */
  label: string;
  /** What the search box looks for, as "names". */
  searchNoun: string;
  /** The checked options. None checked means no filter. */
  values: string[];
  options: FacetOption[];
  onChange: (values: string[]) => void;
  className?: string;
}

/**
 * One filter as a list of choices with their counts, of which any number can
 * be checked, with a search box above that narrows the list.
 *
 * The choices are native checkboxes: the browser gives them Space to toggle
 * and their state in a screen reader. Nothing checked means every choice.
 *
 * A choice with nothing in it is disabled, unless it is checked, so it can
 * always be unchecked. The search only narrows what is shown: a checked
 * choice stays checked while it is hidden, and "Clear" says how many are on.
 */
export function FacetChecklist({
  label,
  searchNoun,
  values,
  options,
  onChange,
  className,
}: FacetChecklistProps) {
  const [search, setSearch] = useState('');
  const searchId = useId();

  const text = search.trim().toLowerCase();
  const shown = text
    ? options.filter((option) => option.label.toLowerCase().includes(text))
    : options;

  function toggle(value: string, checked: boolean) {
    onChange(
      checked ? [...values, value] : values.filter((item) => item !== value),
    );
  }

  return (
    // The legend floats left and Clear right, so they share a line. A
    // fieldset draws a plain legend inside its border and measures its
    // content from below it, which put Clear under the search box. The
    // legend must stay the first child, or it no longer names the group.
    <fieldset className={cn('min-w-0', className)}>
      <legend className="float-left mb-1.5 px-2 text-xs leading-5 font-medium text-muted-foreground">
        {label}
      </legend>
      {values.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="float-right mr-2 mb-1.5 rounded-sm text-xs leading-5 font-medium underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Clear ({values.length})
        </button>
      )}

      <div className="relative clear-both mb-1.5 px-2">
        <label htmlFor={searchId} className="sr-only">
          {`Search ${searchNoun}`}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          placeholder={`Search ${searchNoun}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-background pr-2 pl-7 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-0.5">
        {shown.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted has-checked:bg-muted has-disabled:cursor-default has-disabled:opacity-50 has-disabled:hover:bg-transparent"
            >
              <input
                type="checkbox"
                value={option.value}
                checked={checked}
                disabled={option.count === 0 && !checked}
                onChange={(event) => toggle(option.value, event.target.checked)}
                className="size-3.5 shrink-0 rounded-sm accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
              />
              {option.icon}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.count !== undefined && (
                <>
                  <span
                    aria-hidden="true"
                    className="text-xs font-normal text-muted-foreground tabular-nums"
                  >
                    {option.count}
                  </span>
                  <span className="sr-only">
                    {`, ${option.count} ${option.count === 1 ? 'trace' : 'traces'}`}
                  </span>
                </>
              )}
            </label>
          );
        })}
        {shown.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {`No ${searchNoun} match “${search.trim()}”.`}
          </p>
        )}
      </div>
    </fieldset>
  );
}
