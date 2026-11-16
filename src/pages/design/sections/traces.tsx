import { DurationBar } from '@/components/DurationBar';
import { ServiceLabel } from '@/components/ServiceLabel';
import { SERVICE_COLORS } from '@/components/service-colors';
import { SpanBar } from '@/components/SpanBar';
import { TimelineRuler } from '@/components/TimelineRuler';
import { TraceId } from '@/components/TraceId';
import { BothThemes, Section } from '@/pages/design/design-kit';

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

/** The pieces a trace is drawn with: services, spans, durations, its ID. */
export function TracesSections() {
  return (
    <>
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

      <Section title="Trace ID">
        <BothThemes>
          <p className="mb-2 text-sm text-muted-foreground">
            Point at the ID to see all of it, and to copy it.
          </p>
          <TraceId id="a1b2c3d4e5f60001" />
        </BothThemes>
      </Section>
    </>
  );
}
