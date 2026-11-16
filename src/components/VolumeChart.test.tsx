import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type VolumeBar, VolumeChart } from '@/components/VolumeChart';

const STEP = 30 * 60_000;
const START = Date.parse('2026-11-14T06:00:00Z');
/** Four half-hour bars, 06:00 to 08:00. */
const BARS: VolumeBar[] = [
  { startMs: START, ok: 3, error: 0 },
  { startMs: START + STEP, ok: 1, error: 4 },
  { startMs: START + 2 * STEP, ok: 0, error: 0 },
  { startMs: START + 3 * STEP, ok: 2, error: 1 },
];

function setup() {
  const onZoom = vi.fn<(range: { fromMs: number; toMs: number }) => void>();
  const { container } = render(
    <VolumeChart bars={BARS} stepMs={STEP} onZoom={onZoom} />,
  );
  const plot = container.querySelector<HTMLElement>('.cursor-crosshair')!;
  // jsdom lays nothing out, so the plot is given a width: 400 px, 100 a bar.
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 200 }),
  );
  const drag = (fromX: number, toX: number) => {
    fireEvent.pointerDown(plot, { button: 0, clientX: fromX, pointerId: 1 });
    fireEvent.pointerMove(plot, { clientX: toX, pointerId: 1 });
    fireEvent.pointerUp(plot, { clientX: toX, pointerId: 1 });
  };
  return { onZoom, drag };
}

describe('VolumeChart', () => {
  it('sums the chart up for a screen reader', () => {
    setup();
    expect(
      screen.getByText(
        '11 traces from 14 Nov, 06:00 to 08:00 UTC, in steps of 30 minutes. 5 failed. The busiest step, 14 Nov, 06:30 to 07:00 UTC, had 5.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the counts of a bar in a tooltip, and hides it while dragging', async () => {
    const { drag } = setup();
    const hitAreas = document.querySelectorAll('[data-bar]');
    // An empty bar (07:00 to 07:30) has nothing to point at.
    expect(hitAreas).toHaveLength(3);
    fireEvent.pointerEnter(hitAreas[1]!);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('14 Nov, 06:30 to 07:00 UTC');
    expect(tooltip).toHaveTextContent('1 OK');
    expect(tooltip).toHaveTextContent('4 failed');
    expect(tooltip).toHaveTextContent('Click to zoom in');

    const plot = document.querySelector<HTMLElement>('.cursor-crosshair')!;
    fireEvent.pointerDown(plot, { button: 0, clientX: 150, pointerId: 1 });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    drag(150, 150);
  });

  it('hides the tooltip when the pointer leaves the bar', async () => {
    setup();
    const bar = document.querySelector('[data-bar]')!;
    fireEvent.pointerEnter(bar);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    fireEvent.pointerLeave(bar);
    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  });

  it('zooms to a clicked bar', () => {
    const { onZoom, drag } = setup();
    drag(150, 150);
    expect(onZoom).toHaveBeenCalledWith({
      fromMs: START + STEP,
      toMs: START + 2 * STEP,
    });
  });

  it('zooms to whole bars when dragged across, in either direction', () => {
    const { onZoom, drag } = setup();
    drag(250, 50);
    expect(onZoom).toHaveBeenCalledWith({
      fromMs: START,
      toMs: START + 3 * STEP,
    });
  });

  it('ignores a button other than the main one', () => {
    const { onZoom } = setup();
    const plot = document.querySelector<HTMLElement>('.cursor-crosshair')!;
    fireEvent.pointerDown(plot, { button: 2, clientX: 50, pointerId: 1 });
    fireEvent.pointerUp(plot, { clientX: 50, pointerId: 1 });
    expect(onZoom).not.toHaveBeenCalled();
  });

  it('says so when there is nothing to chart', () => {
    render(<VolumeChart bars={[]} stepMs={STEP} />);
    expect(screen.getByText('No traces in this time.')).toBeVisible();
  });
});
