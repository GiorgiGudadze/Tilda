import { useState } from 'react';
import { ChartTooltip } from '@/components/ChartTooltip';
import { DurationLines } from '@/components/DurationLines';
import { DurationScatter } from '@/components/DurationScatter';
import { Sparkline } from '@/components/Sparkline';
import { StatTile } from '@/components/StatTile';
import { StatusLegend } from '@/components/StatusLegend';
import { StatusMark } from '@/components/StatusMark';
import { VolumeChart } from '@/components/VolumeChart';
import { Button } from '@/components/ui/button';
import { BothThemes, Section } from '@/pages/design/design-kit';

/** Twelve hours in 30-minute bars, with a burst of failures in the middle. */
const SAMPLE_VOLUME = Array.from({ length: 24 }, (_, index) => ({
  startMs: Date.parse('2026-11-14T00:00:00Z') + index * 30 * 60_000,
  ok: 8 + ((index * 7) % 6),
  error: index >= 10 && index < 14 ? 6 + (index % 3) : index % 5 === 0 ? 1 : 0,
}));

/** The same twelve hours: a typical call and the slowest 5%, with one quiet step. */
const SAMPLE_DURATIONS_OVER_TIME = SAMPLE_VOLUME.map((bar, index) => ({
  startMs: bar.startMs,
  medianMs: index === 17 ? null : 60 + ((index * 13) % 40),
  p95Ms:
    index === 17
      ? null
      : index >= 10 && index < 14
        ? 2400 + index * 90
        : 320 + ((index * 37) % 180),
}));

/**
 * Forty sample traces, six minutes apart: mostly fast, a slow stretch in the
 * middle, and a few failures.
 */
const SAMPLE_POINTS = Array.from({ length: 40 }, (_, index) => ({
  id: `sample-${index}`,
  timeMs: Date.parse('2026-11-14T08:00:00Z') + index * 6 * 60_000,
  durationMs:
    [40, 90, 120, 65, 300][index % 5]! * (index >= 22 && index < 30 ? 12 : 1),
  failed: index % 9 === 4,
  name: `GET /sample/${index + 1}`,
  href: '/design',
}));

/** The status legend, starting with `initial` pressed. Click to change it. */
function StatusLegendDemo({ initial }: { initial: 'ok' | 'error' | null }) {
  const [value, setValue] = useState(initial);
  return <StatusLegend value={value} onChange={setValue} />;
}

/** The chart, zoomed to whatever is clicked or dragged. */
function VolumeDemo() {
  const [range, setRange] = useState<{ fromMs: number; toMs: number }>();
  const bars = SAMPLE_VOLUME.filter(
    (bar) =>
      !range || (bar.startMs >= range.fromMs && bar.startMs < range.toMs),
  );
  return (
    <div className="space-y-2">
      <VolumeChart bars={bars} stepMs={30 * 60_000} onZoom={setRange} />
      {range && (
        <Button variant="outline" size="sm" onClick={() => setRange(undefined)}>
          Zoom out
        </Button>
      )}
    </div>
  );
}

/** The volume chart, the stat tile, the lines, the scatter plot and their parts. */
export function ChartsSections() {
  return (
    <>
      <Section title="Volume chart">
        <BothThemes>
          <VolumeDemo />
          <VolumeChart bars={[]} stepMs={30 * 60_000} />
        </BothThemes>
      </Section>

      <Section title="Stat tile">
        <BothThemes>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Requests"
              value="1,284"
              detail="calls to postgres"
              trend={SAMPLE_VOLUME.map((bar) => bar.ok + bar.error)}
            />
            <StatTile
              label="Failed"
              value="4%"
              detail="51 of 1,284 calls"
              trend={SAMPLE_VOLUME.map(
                (bar) => bar.error / (bar.ok + bar.error),
              )}
            />
            <StatTile
              label="Slowest 5%"
              value="–"
              detail="no calls to measure"
            />
          </div>
        </BothThemes>
      </Section>

      <Section title="Sparkline">
        <p className="max-w-prose text-sm text-muted-foreground">
          The shape of a number over time, with no axis: steady, with a gap
          where nothing was measured, and flat at zero.
        </p>
        <BothThemes>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-10">
              <Sparkline
                values={SAMPLE_VOLUME.map((bar) => bar.ok + bar.error)}
              />
            </div>
            <div className="h-10">
              <Sparkline
                values={SAMPLE_DURATIONS_OVER_TIME.map((step) => step.p95Ms)}
              />
            </div>
            <div className="h-10">
              <Sparkline values={SAMPLE_VOLUME.map(() => 0)} />
            </div>
          </div>
        </BothThemes>
      </Section>

      <Section title="Duration lines">
        <BothThemes>
          <DurationLines
            steps={SAMPLE_DURATIONS_OVER_TIME}
            stepMs={30 * 60_000}
          />
        </BothThemes>
        <DurationLines steps={[]} stepMs={60_000} className="max-w-md" />
      </Section>

      <Section title="Duration scatter">
        <BothThemes>
          <DurationScatter
            points={SAMPLE_POINTS}
            band={{ minMs: 1000, maxMs: 2000 }}
          />
          <DurationScatter points={[]} />
        </BothThemes>
      </Section>

      <Section title="Chart tooltip">
        <p className="max-w-prose text-sm text-muted-foreground">
          One tooltip per chart, moved to the mark under the pointer. Here it is
          held open over a sample mark.
        </p>
        <BothThemes>
          <div className="relative h-28 rounded-lg border">
            <svg
              aria-hidden="true"
              viewBox="-6 -6 12 12"
              className="absolute top-[70%] left-1/2 size-3 -translate-1/2 overflow-visible"
            >
              <circle r="4.5" className="fill-destructive" />
            </svg>
            <ChartTooltip at={{ left: '50%', top: '70%' }}>
              <div className="space-y-1">
                <p className="font-medium">POST /checkout</p>
                <p className="flex items-center gap-1.5">
                  <StatusMark failed tone="on-primary" />
                  640 ms, Error
                </p>
              </div>
            </ChartTooltip>
          </div>
        </BothThemes>
      </Section>

      <Section title="Status legend">
        <p className="max-w-prose text-sm text-muted-foreground">
          The legend of the scatter marks, and the status filter. Both statuses
          shown, then only OK, then only Error.
        </p>
        <BothThemes>
          <div className="space-y-3">
            <StatusLegendDemo initial={null} />
            <StatusLegendDemo initial="ok" />
            <StatusLegendDemo initial="error" />
          </div>
        </BothThemes>
      </Section>
    </>
  );
}
