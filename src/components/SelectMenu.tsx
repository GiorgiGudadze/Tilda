import { Check, ChevronsUpDown } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { PICKER_ITEM, PICKER_TRIGGER } from '@/components/ui/picker';
import { cn } from '@/lib/utils';

interface SelectMenuOption<Value extends string> {
  value: Value;
  label: string;
  /** Sits before the label, in the list and on the button. */
  icon?: ReactNode;
}

interface SelectMenuProps<Value extends string> {
  /** Lets a `<label htmlFor>` point at the button. */
  id?: string;
  /** What is chosen, for example "Sort". It names the button and the list. */
  label: string;
  value: Value;
  options: SelectMenuOption<Value>[];
  onChange: (value: Value) => void;
  /** Which edge of the button the list lines up with. */
  align?: 'start' | 'end';
  className?: string;
}

/**
 * A short list to pick one option from, with the look of `Combobox` but no
 * search box: there is nothing to search in four options.
 *
 * Radix's dropdown menu owns the hard parts: focus moves into the list and
 * back, arrow keys and typing a letter move through it, Escape and an
 * outside click close it, and each choice is a radio item, so a screen
 * reader hears which one is checked.
 */
export function SelectMenu<Value extends string>({
  id,
  label,
  value,
  options,
  onChange,
  align = 'start',
  className,
}: SelectMenuProps<Value>) {
  const selected = options.find((option) => option.value === value);

  return (
    // Not modal, like the Combobox popover. A modal menu hides the whole
    // page from screen readers while it is open, which axe rightly flags:
    // the page loses its heading and landmarks, yet keeps focusable parts.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          id={id}
          type="button"
          // The visible label alone would hide the chosen value from a
          // screen reader, so the name says both: "Sort: Newest first".
          aria-label={`${label}: ${selected?.label ?? value}`}
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
      </DropdownMenu.Trigger>
      {/* No portal: the list stays next to its button, inside the page's
          main landmark. It still floats above the page. */}
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        collisionPadding={8}
        className="z-50 w-(--radix-dropdown-menu-trigger-width) max-w-[calc(100vw-1rem)] min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none"
      >
        <DropdownMenu.RadioGroup
          value={value}
          onValueChange={(next) => {
            const option = options.find((item) => item.value === next);
            if (option) {
              onChange(option.value);
            }
          }}
        >
          {options.map((option) => (
            <DropdownMenu.RadioItem
              key={option.value}
              value={option.value}
              className={PICKER_ITEM}
            >
              {option.icon}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <DropdownMenu.ItemIndicator>
                <Check aria-hidden="true" className="size-4 shrink-0" />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
