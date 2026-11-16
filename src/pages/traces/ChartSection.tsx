import { ChartColumnStacked, ChartScatter } from 'lucide-react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatusLegend } from '@/components/StatusLegend';
import {
  type ChartView,
  type TraceFilters,
  useChartView,
} from '@/features/traces/filters';
import { TraceScatter } from '@/features/traces/TraceScatter';
import { TraceVolume } from '@/features/traces/TraceVolume';

const CHART_OPTIONS: {
  value: ChartView;
  label: string;
  icon: typeof ChartColumnStacked;
}[] = [
  // Scatter first: it is the default view, and it shows both when and how slow.
  { value: 'scatter', label: 'Scatter', icon: ChartScatter },
  { value: 'volume', label: 'Volume', icon: ChartColumnStacked },
];

interface ChartSectionProps {
  /** The filters as sent to the API: typed fields already debounced. */
  query: TraceFilters;
  /** The duration as typed, to shade on the scatter plot without waiting. */
  duration: Pick<TraceFilters, 'minMs' | 'maxMs'>;
  onChange: (patch: Partial<TraceFilters>) => void;
  /** A zoom to a span of time. */
  onZoom: (range: Pick<TraceFilters, 'from' | 'to'>) => void;
}

/**
 * The chart above the list: Scatter or Volume, kept in the URL, with the
 * status legend that also filters in both views.
 */
export function ChartSection({
  query,
  duration,
  onChange,
  onZoom,
}: ChartSectionProps) {
  const [chart, setChart] = useChartView();
  const { q, service, status, name, from, to } = query;

  return (
    <section aria-label="Chart" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <SegmentedControl
          label="Chart"
          value={chart}
          options={CHART_OPTIONS}
          onChange={(view) => void setChart(view)}
        />
        <StatusLegend
          value={status}
          onChange={(next) => onChange({ status: next })}
        />
      </div>
      {chart === 'volume' ? (
        <TraceVolume
          filters={{
            q,
            service,
            status,
            name,
            minMs: query.minMs,
            maxMs: query.maxMs,
            from,
            to,
          }}
          onZoom={onZoom}
        />
      ) : (
        // The scatter plot shows every duration and shades the chosen range.
        <TraceScatter
          filters={{ q, service, status, name, from, to }}
          duration={duration}
          onZoom={onZoom}
        />
      )}
    </section>
  );
}
