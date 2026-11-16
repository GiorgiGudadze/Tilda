import {
  ChartColumnStacked,
  ChartScatter,
  CreditCard,
  Database,
  Zap,
} from 'lucide-react';
import { useId, useState } from 'react';
import { Combobox } from '@/components/Combobox';
import {
  DurationRangeInput,
  type MillisecondRange,
} from '@/components/DurationRangeInput';
import { FacetChecklist } from '@/components/FacetChecklist';
import { Field } from '@/components/Field';
import { Pagination } from '@/components/Pagination';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SelectMenu } from '@/components/SelectMenu';
import { ServiceIcon } from '@/components/ServiceIcon';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TimeRange } from '@/lib/time-range';
import { BothThemes, Section } from '@/pages/design/design-kit';

const SAMPLE_SERVICES = [
  {
    value: 'payments',
    label: 'payments',
    icon: <ServiceIcon icon={CreditCard} color={8} />,
  },
  {
    value: 'postgres',
    label: 'postgres',
    icon: <ServiceIcon icon={Database} color={5} />,
  },
  {
    value: 'redis',
    label: 'redis',
    icon: <ServiceIcon icon={Zap} color={7} />,
  },
];

/** The combobox with a few services. Its list wears the theme of the page. */
function ComboboxDemo({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState('postgres');
  return (
    <Field label={label} htmlFor={id}>
      <Combobox
        id={id}
        label={label}
        value={value}
        options={SAMPLE_SERVICES}
        onChange={setValue}
        searchPlaceholder="Search services"
        disabled={disabled}
      />
    </Field>
  );
}

/** The dropdown for a short list, as the Sort control uses it. */
function SelectMenuDemo({ label }: { label: string }) {
  const id = useId();
  const [value, setValue] = useState('newest');
  return (
    <Field label={label} htmlFor={id}>
      <SelectMenu
        id={id}
        label={label}
        value={value}
        options={[
          { value: 'newest', label: 'Newest first' },
          { value: 'oldest', label: 'Oldest first' },
          { value: 'slowest', label: 'Slowest first' },
          { value: 'fastest', label: 'Fastest first' },
        ]}
        onChange={setValue}
      />
    </Field>
  );
}

/** Every text control, empty, filled, invalid and disabled. */
function FormControls() {
  const id = useId();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Empty" htmlFor={`${id}-empty`}>
        <Input
          id={`${id}-empty`}
          type="search"
          placeholder="Operation or trace ID"
        />
      </Field>
      <Field label="Filled" htmlFor={`${id}-filled`}>
        <Input id={`${id}-filled`} defaultValue="checkout" />
      </Field>
      <Field label="Invalid" htmlFor={`${id}-invalid`}>
        <Input
          id={`${id}-invalid`}
          defaultValue="A cause that is far too long"
          aria-invalid
        />
      </Field>
      <Field label="Disabled" htmlFor={`${id}-disabled`}>
        <Input id={`${id}-disabled`} defaultValue="checkout" disabled />
      </Field>
      <SelectMenuDemo label="Select menu" />
      <ComboboxDemo label="Combobox" />
      <ComboboxDemo label="Combobox, disabled" disabled />
      <Field label="Text area" htmlFor={`${id}-area`}>
        <Textarea id={`${id}-area`} rows={2} placeholder="What you found" />
      </Field>
      <Field label="Text area, invalid" htmlFor={`${id}-area-invalid`}>
        <Textarea
          id={`${id}-area-invalid`}
          rows={2}
          defaultValue="Too long"
          aria-invalid
        />
      </Field>
    </div>
  );
}

/**
 * The checklist with two names checked and one with no traces, which is
 * disabled. Type in its search box to narrow the list.
 */
function FacetChecklistDemo() {
  const [values, setValues] = useState(['GET /orders', 'POST /login']);
  return (
    <FacetChecklist
      label="Name"
      searchNoun="names"
      values={values}
      onChange={setValues}
      options={[
        { value: 'GET /orders', label: 'GET /orders', count: 97 },
        { value: 'GET /products/:id', label: 'GET /products/:id', count: 64 },
        { value: 'POST /checkout', label: 'POST /checkout', count: 81 },
        { value: 'POST /login', label: 'POST /login', count: 12 },
        { value: 'POST /refund', label: 'POST /refund', count: 0 },
      ]}
    />
  );
}

/** A time range picker, starting from `initial`. */
function TimeRangeDemo({ initial }: { initial: TimeRange | null }) {
  const [value, setValue] = useState(initial);
  return <TimeRangePicker value={value} onChange={setValue} />;
}

/** A duration range that can be typed in, starting from `initial`. */
function DurationRangeDemo({
  label,
  initial,
}: {
  label: string;
  initial: MillisecondRange;
}) {
  const [value, setValue] = useState(initial);
  return <DurationRangeInput label={label} value={value} onChange={setValue} />;
}

function SegmentedControlDemo({ label }: { label: string }) {
  const [view, setView] = useState<'volume' | 'scatter'>('volume');
  return (
    <SegmentedControl
      label={label}
      value={view}
      onChange={setView}
      options={[
        { value: 'volume', label: 'Volume', icon: ChartColumnStacked },
        { value: 'scatter', label: 'Scatter', icon: ChartScatter },
      ]}
    />
  );
}

function PaginationDemo({ label }: { label: string }) {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      page={page}
      pageCount={3}
      onPageChange={setPage}
      label={label}
    />
  );
}

/** Every control, and the filters built from them. */
export function FormsSections() {
  return (
    <>
      <Section title="Field">
        <p className="max-w-prose text-sm text-muted-foreground">
          A control with its label above it, as every filter on the traces and
          services pages has.
        </p>
        <BothThemes>
          {(theme) => (
            <Field label={`Search, ${theme}`} htmlFor={`field-${theme}`}>
              <Input
                id={`field-${theme}`}
                placeholder="Operation or trace ID"
              />
            </Field>
          )}
        </BothThemes>
      </Section>

      <Section title="Form controls">
        <BothThemes>
          <FormControls />
        </BothThemes>
      </Section>

      <Section title="Facet checklist">
        <BothThemes>
          <div className="max-w-56">
            <FacetChecklistDemo />
          </div>
        </BothThemes>
      </Section>

      <Section title="Duration range">
        <BothThemes>
          {(theme) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <DurationRangeDemo
                label={`Empty, ${theme}`}
                initial={{ minMs: null, maxMs: null }}
              />
              <DurationRangeDemo
                label={`Filled, ${theme}`}
                initial={{ minMs: 100, maxMs: 499 }}
              />
              <DurationRangeDemo
                label={`Max below min, ${theme}`}
                initial={{ minMs: 500, maxMs: 200 }}
              />
            </div>
          )}
        </BothThemes>
      </Section>

      <Section title="Time range">
        <p className="max-w-prose text-sm text-muted-foreground">
          A quick range applies on click. A custom range applies with its
          button, and says what is wrong before it does.
        </p>
        <BothThemes>
          <div className="grid gap-4 sm:grid-cols-3">
            <TimeRangeDemo initial={null} />
            <TimeRangeDemo initial={{ from: 'now-6h', to: 'now' }} />
            <TimeRangeDemo
              initial={{ from: '2026-11-14 06:00', to: '2026-11-14 08:00' }}
            />
          </div>
        </BothThemes>
      </Section>

      <Section title="Segmented control">
        <BothThemes>
          {(theme) => <SegmentedControlDemo label={`Chart, ${theme} theme`} />}
        </BothThemes>
      </Section>

      <Section title="Pagination">
        <BothThemes>
          {(theme) => <PaginationDemo label={`Pagination, ${theme} theme`} />}
        </BothThemes>
      </Section>
    </>
  );
}
