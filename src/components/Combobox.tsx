import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PICKER_ITEM, PICKER_TRIGGER } from '@/components/ui/picker';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  /** Shown in the list and on the button. Search matches it. Must be unique. */
  label: string;
  /** Sits before the label, in the list and on the button. */
  icon?: ReactNode;
}

interface ComboboxProps {
  /** Lets a `<label htmlFor>` name the button. */
  id?: string;
  /** Names the list and its search box, for example "Service". */
  label: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A select with a search box: a button that opens a list to pick one option
 * from. For lists that can grow; a short fixed list is a `SelectMenu`.
 *
 * Two libraries own the hard parts. Radix Popover moves focus in and back and
 * closes on Escape or an outside click. cmdk filters the list and handles the
 * arrow keys and Enter.
 *
 * The button is a plain button that opens a dialog. The combobox, in the
 * ARIA sense, is the search box inside it.
 */
export function Combobox({
  id,
  label,
  value,
  options,
  onChange,
  searchPlaceholder = 'Search…',
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          // The visible label alone would hide the chosen value from a
          // screen reader, so the name says both: "Service: payments".
          aria-label={`${label}: ${selected?.label ?? value}`}
          disabled={disabled}
          className={cn(PICKER_TRIGGER, className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.icon}
            <span className="truncate">{selected?.label ?? value}</span>
          </span>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={label}
        className="w-(--radix-popover-trigger-width) min-w-52 p-0"
      >
        {/* The list opens with the chosen option highlighted. */}
        <Command label={label} defaultValue={selected?.label}>
          <div className="flex items-center gap-2 border-b px-2.5">
            <Search
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <Command.Input
              placeholder={searchPlaceholder}
              className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matches
            </Command.Empty>
            {options.map((option) => (
              <Command.Item
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={PICKER_ITEM}
              >
                {option.icon}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.value === value && (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
