import { SearchX } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { DurationBar } from '@/components/DurationBar';
import { DurationChart } from '@/components/DurationChart';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { ServiceLabel } from '@/components/ServiceLabel';
import {
  SERVICE_BACKGROUNDS,
  SERVICE_COLORS,
} from '@/components/service-colors';
import { Skeleton } from '@/components/Skeleton';
import { SpanBar } from '@/components/SpanBar';
import { StatusBadge } from '@/components/StatusBadge';
import { SuggestionCard } from '@/components/SuggestionCard';
import { TimelineRuler } from '@/components/TimelineRuler';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Token groups. Class names are written in full so Tailwind can find them. */
const TOKEN_GROUPS = [
  {
    title: 'Surfaces',
    tokens: [
      { name: 'background', className: 'bg-background' },
      { name: 'card', className: 'bg-card' },
      { name: 'muted', className: 'bg-muted' },
    ],
  },
  {
    title: 'Text and the primary action',
    tokens: [
      { name: 'foreground', className: 'bg-foreground' },
      { name: 'muted-foreground', className: 'bg-muted-foreground' },
      { name: 'primary', className: 'bg-primary' },
    ],
  },
  {
    title: 'Lines',
    tokens: [
      { name: 'border', className: 'bg-border' },
      { name: 'input', className: 'bg-input' },
      { name: 'ring', className: 'bg-ring' },
    ],
  },
  {
    title: 'Status',
    tokens: [
      { name: 'success', className: 'bg-success' },
      { name: 'destructive', className: 'bg-destructive' },
    ],
  },
  {
    title: 'Services',
    tokens: SERVICE_COLORS.map((color) => ({
      name: `service-${color}`,
      className: SERVICE_BACKGROUNDS[color],
    })),
  },
];

/** A few spans, as plain numbers, to show the bar in its different shapes. */
const SAMPLE_SPANS = [
  { label: 'Whole timeline', start: 0, length: 1, color: 4 },
  { label: 'Starts late', start: 0.35, length: 0.5, color: 6 },
  { label: 'Ends at the end', start: 0.8, length: 0.2, color: 3 },
  { label: 'Very short', start: 0.5, length: 0.001, color: 8 },
  { label: 'Unknown service', start: 0.1, length: 0.3, color: 'other' },
] as const;

const SAMPLE_DURATIONS = [
  { label: '2.90 s', value: 2900 },
  { label: '1.16 s', value: 1160 },
  { label: '58 ms', value: 58 },
  { label: '0 ms', value: 0 },
];

const SAMPLE_BARS = [
  { key: 'a', label: 'Under 100 ms', count: 62 },
  { key: 'b', label: '100 to 500 ms', count: 48 },
  { key: 'c', label: '500 ms to 1 s', count: 0 },
  { key: 'd', label: '1 to 2 s', count: 17 },
  { key: 'e', label: '2 to 3 s', count: 1 },
  { key: 'f', label: '3 s or more', count: 9 },
];

/** The chart with one bar selected. Click a bar to select or clear it. */
function ChartDemo() {
  const [selected, setSelected] = useState<string | null>('d');
  return (
    <DurationChart
      bars={SAMPLE_BARS}
      selectedKey={selected}
      onSelect={setSelected}
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

/** A sample control with its label above it. */
function SampleField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type ThemeName = 'light' | 'dark';

/**
 * Renders the same content twice: once in the light theme, once in the dark.
 * Pass a function when the content needs to know which theme it is in.
 */
function BothThemes({
  children,
}: {
  children: ReactNode | ((theme: ThemeName) => ReactNode);
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(['light', 'dark'] as const).map((theme) => (
        <div
          key={theme}
          className={cn(
            theme,
            'space-y-4 rounded-lg border bg-background p-4 text-foreground',
          )}
        >
          <p className="text-xs font-medium text-muted-foreground">
            {theme === 'light' ? 'Light theme' : 'Dark theme'}
          </p>
          {typeof children === 'function' ? children(theme) : children}
        </div>
      ))}
    </div>
  );
}

export function DesignPage() {
  return (
    <>
      <p className="max-w-prose text-muted-foreground">
        The colour tokens and the components this app is built from, each in
        every state and in both themes. Components take plain props and know
        nothing about the API.
      </p>

      <Section title="Colour tokens">
        <BothThemes>
          {TOKEN_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-sm font-medium">{group.title}</h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.tokens.map((token) => (
                  <li key={token.name} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-6 shrink-0 rounded-md border',
                        token.className,
                      )}
                    />
                    <code className="text-xs">{token.name}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </BothThemes>
      </Section>

      <Section title="Button">
        <BothThemes>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled>Primary, disabled</Button>
            <Button variant="outline" disabled>
              Outline, disabled
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </BothThemes>
      </Section>

      <Section title="Status badge">
        <BothThemes>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <StatusBadge status="ok" />
            <StatusBadge status="error" />
            <StatusBadge status="error" label="Failed" />
          </div>
        </BothThemes>
      </Section>

      <Section title="Confidence badge">
        <BothThemes>
          <div className="space-y-2 text-sm">
            <ConfidenceBadge confidence="high" basis="78% of trace time" />
            <ConfidenceBadge
              confidence="medium"
              basis="a span failed, the request succeeded"
            />
            <ConfidenceBadge
              confidence="low"
              basis="largest span is 18% of trace time"
            />
            <ConfidenceBadge confidence="high" />
          </div>
        </BothThemes>
      </Section>

      <Section title="Suggestion card">
        <BothThemes>
          <SuggestionCard title="Suggested cause" variant="suggestion">
            <p>
              Most of the time is spent in postgres: SELECT orders WHERE user_id
              = ?.
            </p>
            <ConfidenceBadge confidence="high" basis="78% of trace time" />
            <div className="flex flex-wrap gap-2">
              <Button>Accept</Button>
              <Button variant="outline">Edit</Button>
              <Button variant="outline">Reject</Button>
            </div>
          </SuggestionCard>
          <SuggestionCard title="Cause" variant="decided">
            <p>A missing index on orders.user_id.</p>
            <Button variant="outline">Change decision</Button>
          </SuggestionCard>
        </BothThemes>
      </Section>

      <Section title="Service label">
        <BothThemes>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {SERVICE_COLORS.map((color) => (
              <li key={color}>
                <ServiceLabel
                  name={color === 'other' ? 'unknown' : `service-${color}`}
                  color={color}
                />
              </li>
            ))}
          </ul>
        </BothThemes>
      </Section>

      <Section title="Span bar and timeline ruler">
        <BothThemes>
          <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
            <TimelineRuler
              labels={['0 ms', '725 ms', '1.45 s', '2.18 s', '2.90 s']}
              className="col-start-2"
            />
          </div>
          <ul className="space-y-2 text-sm">
            {SAMPLE_SPANS.map((span) => (
              <li
                key={span.label}
                className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3"
              >
                {span.label}
                <SpanBar
                  start={span.start}
                  length={span.length}
                  color={span.color}
                />
              </li>
            ))}
          </ul>
        </BothThemes>
      </Section>

      <Section title="Duration bar">
        <BothThemes>
          <ul className="space-y-2 text-sm">
            {SAMPLE_DURATIONS.map((duration) => (
              <li
                key={duration.label}
                className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3"
              >
                <span className="text-right tabular-nums">
                  {duration.label}
                </span>
                <DurationBar value={duration.value} max={2900} />
              </li>
            ))}
          </ul>
        </BothThemes>
      </Section>

      <Section title="Form controls">
        <BothThemes>
          <div className="grid grid-cols-2 gap-3">
            <SampleField label="Empty">
              <Input type="search" placeholder="Operation or trace ID" />
            </SampleField>
            <SampleField label="Filled">
              <Input defaultValue="checkout" />
            </SampleField>
            <SampleField label="Invalid">
              <Input defaultValue="A cause that is far too long" aria-invalid />
            </SampleField>
            <SampleField label="Disabled">
              <Input defaultValue="checkout" disabled />
            </SampleField>
            <SampleField label="Select">
              <Select defaultValue="newest">
                <option value="newest">Newest first</option>
                <option value="slowest">Slowest first</option>
              </Select>
            </SampleField>
            <SampleField label="Select, disabled">
              <Select defaultValue="newest" disabled>
                <option value="newest">Newest first</option>
              </Select>
            </SampleField>
            <SampleField label="Text area">
              <Textarea rows={2} placeholder="What you found" />
            </SampleField>
            <SampleField label="Text area, invalid">
              <Textarea rows={2} defaultValue="Too long" aria-invalid />
            </SampleField>
          </div>
        </BothThemes>
      </Section>

      <Section title="Duration chart">
        <BothThemes>
          <ChartDemo />
        </BothThemes>
      </Section>

      <Section title="Pagination">
        <BothThemes>
          {(theme) => <PaginationDemo label={`Pagination, ${theme} theme`} />}
        </BothThemes>
      </Section>

      <Section title="Popover, alert dialog and toast">
        <p className="max-w-prose text-sm text-muted-foreground">
          These open outside the box they were called from, so they always wear
          the theme of the page.
        </p>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Open the alert dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Unpin POST /checkout?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes its note. It cannot be undone.
              </AlertDialogDescription>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <AlertDialogCancel asChild>
                  <Button variant="outline">Keep it pinned</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive">Unpin and delete</Button>
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            onClick={() =>
              toast.error(
                'The status could not be changed. It is back as it was.',
              )
            }
          >
            Show an error toast
          </Button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open the popover</Button>
          </PopoverTrigger>
          <PopoverContent aria-label="Sample popover" className="space-y-2">
            <p className="font-medium">A popover</p>
            <p>Escape or a click outside closes it.</p>
          </PopoverContent>
        </Popover>
      </Section>

      <Section title="Empty state">
        <BothThemes>
          <EmptyState
            icon={SearchX}
            title="No traces match these filters"
            description="Try a wider duration range or a different service."
            action={<Button variant="outline">Clear filters</Button>}
          />
          <EmptyState title="Nothing pinned yet" />
        </BothThemes>
      </Section>

      <Section title="Error state">
        <BothThemes>
          <ErrorState
            title="The traces could not be loaded"
            description="The server did not answer."
            onRetry={() => {}}
          />
          <ErrorState title="The trace could not be loaded" />
        </BothThemes>
      </Section>

      <Section title="Skeleton">
        <BothThemes>
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-24 w-full" />
        </BothThemes>
      </Section>
    </>
  );
}
