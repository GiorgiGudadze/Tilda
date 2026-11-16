import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { PAGE_SIZE } from '@/features/traces/schemas';
import { formatDuration } from '@/lib/format';
import { writeDecisions } from '@/mocks/decisions';
import { createDataset, SEEDED_TRACE_IDS } from '@/mocks/seed';
import { setScreen } from '@/test/match-media';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

const dataset = createDataset();

// The URL is written a moment after the screen changes, so the checks of
// the URL below wait for it.

/** The rows of the results table, without the header row. */
function rows() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

async function findRows() {
  await screen.findByRole('table');
  return rows();
}

/** A status in the legend above the chart, which is the status filter. */
const statusButton = (name: 'OK' | 'Error') =>
  within(screen.getByRole('group', { name: 'Status' })).getByRole('button', {
    name,
  });

const minField = () =>
  screen.getByRole('textbox', { name: 'Min duration, in milliseconds' });
const maxField = () =>
  screen.getByRole('textbox', { name: 'Max duration, in milliseconds' });

/** How many traces took from `min` to `max` ms, both included. */
function countBetween(min: number, max: number) {
  return dataset.traces.filter(
    (trace) => trace.durationMs >= min && trace.durationMs <= max,
  ).length;
}

describe('Traces page', () => {
  it('redirects the home page to the list of traces', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Traces' }),
    ).toBeVisible();
  });

  it('lists the newest traces with their status and duration', async () => {
    renderApp('/traces');

    expect(screen.getByText('Loading traces…')).toBeInTheDocument();

    const found = await findRows();
    expect(found).toHaveLength(25);
    expect(screen.getByText('1 to 25 of 503 traces')).toBeVisible();

    const newest = within(found[0]!);
    expect(newest.getByRole('link', { name: 'GET /orders' })).toBeVisible();
    expect(newest.getByText('2.90 s')).toBeVisible();
    expect(newest.getByText('OK')).toBeVisible();

    const failed = within(found[1]!);
    expect(failed.getByRole('link', { name: 'POST /checkout' })).toBeVisible();
    expect(failed.getByText('Error')).toBeVisible();
  });

  it('opens a trace from the list', async () => {
    const user = userEvent.setup();
    renderApp('/traces');

    const links = await screen.findAllByRole('link', { name: 'GET /orders' });
    await user.click(links[0]!);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'GET /orders' }),
    ).toBeVisible();
  });

  it('shows cards instead of a table on a phone', async () => {
    setScreen('phone');
    renderApp('/traces');

    const cards = await screen.findAllByRole('listitem');
    expect(cards).toHaveLength(25);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'GET /orders' })[0],
    ).toBeVisible();
    // Two lines: the request and its status, then duration, service and
    // time. The trace ID is left for the trace's own page.
    const [first] = cards;
    expect(first).toHaveTextContent(
      /^\S+ \S+.*(OK|Error)\d[\d.]* m?s, [a-z-]+, \d{1,2} [A-Z][a-z]{2}, /,
    );
    expect(first).not.toHaveTextContent(/[0-9a-f]{16}/);
  });

  it('explains traces to a newcomer', async () => {
    const user = userEvent.setup();
    renderApp('/traces');

    await user.click(screen.getByRole('button', { name: 'New to traces?' }));
    expect(screen.getByText('Think of a parcel')).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Think of a parcel')).not.toBeInTheDocument();
  });
});

describe('Traces page filters', () => {
  it('filters by status from the legend, and shows both again on a second press', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();
    const error = statusButton('Error');
    const ok = statusButton('OK');
    expect(error).toHaveAttribute('aria-pressed', 'false');
    expect(ok).toHaveAttribute('aria-pressed', 'false');

    await user.click(error);

    expect(error).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(rows().every((row) => within(row).queryByText('Error'))).toBe(
        true,
      );
    });
    await waitFor(() => expect(search().get('status')).toBe('error'));

    // Pressing the other status switches to it.
    await user.click(ok);

    expect(ok).toHaveAttribute('aria-pressed', 'true');
    expect(error).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(search().get('status')).toBe('ok'));

    await user.click(ok);

    expect(ok).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText('1 to 25 of 503 traces')).toBeVisible();
    await waitFor(() => expect(search().get('status')).toBeNull());
  });

  it('has no status dropdown: the legend is the status filter', async () => {
    renderApp('/traces');
    await findRows();

    expect(
      screen.queryByRole('combobox', { name: 'Status' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Status' })).toBeVisible();
  });

  it('keeps the status legend in the scatter view, where it is the legend of the marks', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?chart=scatter');
    await findRows();

    await user.click(statusButton('Error'));

    await waitFor(() => expect(search().get('status')).toBe('error'));
    expect(search().get('chart')).toBe('scatter');
  });

  it('filters by a service that took part in the trace', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');

    await user.click(
      screen.getByRole('button', { name: 'Service: All services' }),
    );
    await user.click(await screen.findByRole('option', { name: 'payments' }));

    await waitFor(() => {
      expect(
        rows().every((row) =>
          within(row).queryByRole('link', { name: 'POST /checkout' }),
        ),
      ).toBe(true);
    });
    await waitFor(() => expect(search().get('service')).toBe('payments'));
  });

  it('searches as the user types, once typing stops', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'login');

    await waitFor(() => {
      expect(
        rows().every((row) =>
          within(row).queryByRole('link', { name: 'POST /login' }),
        ),
      ).toBe(true);
    });
    await waitFor(() => expect(search().get('q')).toBe('login'));
  });

  it('sorts from the Sort dropdown, which is a list of four orders', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();
    const sort = screen.getByRole('button', { name: 'Sort: Newest first' });

    await user.click(sort);

    const menu = screen.getByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent),
    ).toEqual([
      'Newest first',
      'Oldest first',
      'Slowest first',
      'Fastest first',
    ]);
    expect(
      within(menu).getByRole('menuitemradio', { name: 'Newest first' }),
    ).toBeChecked();

    await user.click(
      within(menu).getByRole('menuitemradio', { name: 'Slowest first' }),
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sort: Slowest first' }),
    ).toHaveFocus();
    const slowest = Math.max(...dataset.traces.map((t) => t.durationMs));
    await waitFor(() => {
      expect(
        within(rows()[0]!).getByText(formatDuration(slowest)),
      ).toBeVisible();
    });
    await waitFor(() => expect(search().get('sort')).toBe('slowest'));
  });

  it('sorts from the keyboard in the Sort dropdown', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    screen.getByRole('button', { name: 'Sort: Newest first' }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(search().get('sort')).toBe('oldest'));
    expect(
      screen.getByRole('button', { name: 'Sort: Oldest first' }),
    ).toBeVisible();
  });

  it('sorts by clicking a column header, and turns it around on a second click', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();
    const header = (name: string) => screen.getByRole('columnheader', { name });
    const durations = () =>
      rows().map((row) => within(row).getAllByRole('cell')[3]?.textContent);

    // Newest first by default: Started is sorted, Duration is not.
    expect(header('Started')).toHaveAttribute('aria-sort', 'descending');
    expect(header('Duration')).not.toHaveAttribute('aria-sort');
    // The other columns cannot be sorted.
    for (const name of ['Trace ID', 'Request']) {
      expect(
        within(header(name)).queryByRole('button'),
      ).not.toBeInTheDocument();
    }
    // The first column holds each trace's whole ID, cut short only on screen.
    expect(within(rows()[0]!).getAllByRole('cell')[0]).toHaveTextContent(
      dataset.traces[0]!.id,
    );

    await user.click(within(header('Duration')).getByRole('button'));

    await waitFor(() => expect(search().get('sort')).toBe('slowest'));
    expect(header('Duration')).toHaveAttribute('aria-sort', 'descending');
    expect(header('Started')).not.toHaveAttribute('aria-sort');
    const slowest = Math.max(...dataset.traces.map((t) => t.durationMs));
    await waitFor(() =>
      expect(durations()[0]).toContain(formatDuration(slowest)),
    );
    // The dropdown follows the header.
    expect(
      screen.getByRole('button', { name: 'Sort: Slowest first' }),
    ).toBeVisible();

    await user.click(within(header('Duration')).getByRole('button'));

    await waitFor(() => expect(search().get('sort')).toBe('fastest'));
    expect(header('Duration')).toHaveAttribute('aria-sort', 'ascending');
    const fastest = Math.min(...dataset.traces.map((t) => t.durationMs));
    await waitFor(() =>
      expect(durations()[0]).toContain(formatDuration(fastest)),
    );

    await user.click(within(header('Started')).getByRole('button'));

    // Newest first is the default, so it leaves the URL.
    await waitFor(() => expect(search().get('sort')).toBeNull());
    expect(header('Started')).toHaveAttribute('aria-sort', 'descending');
  });

  it('charts the traces per step of time, and zooms the time to a clicked bar', async () => {
    const { search } = renderApp('/traces?chart=volume');
    await findRows();

    // The plot is for the mouse; a screen reader gets the summary.
    expect(
      await screen.findByText(
        /^503 traces from .+ UTC, in steps of 30 minutes\. \d+ failed\./,
      ),
    ).toBeInTheDocument();

    const plot = screen
      .getByText(/Click a bar, or drag across several/)
      .closest('figure')!
      .querySelector<HTMLElement>('.cursor-crosshair')!;
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 1000, height: 200 }),
    );
    // The far right is the last bar, the half hour before "now".
    fireEvent.pointerDown(plot, { button: 0, clientX: 999, pointerId: 1 });
    fireEvent.pointerUp(plot, { button: 0, clientX: 999, pointerId: 1 });

    await waitFor(() => expect(search().get('from')).toBe('2026-11-14 11:30'));
    expect(search().get('to')).toBe('2026-11-14 12:00');
    expect(
      screen.getByRole('button', { name: 'Time: 14 Nov, 11:30 to 12:00 UTC' }),
    ).toBeVisible();
    expect(
      await screen.findByText(/^1 to \d+ of \d+ traces$/),
    ).not.toHaveTextContent('of 503');

    // The zoom has its own entry in the history: Back undoes it.
    window.history.back();
    await waitFor(() => expect(search().get('from')).toBeNull());
    expect(await screen.findByText('1 to 25 of 503 traces')).toBeVisible();
  });

  it('shows the counts of a bar in a tooltip', async () => {
    const user = userEvent.setup();
    renderApp('/traces?chart=volume&from=now-1h&to=now');
    await findRows();
    await screen.findByText(/in steps of 1 minute/);

    const bars = screen
      .getByText(/Click a bar, or drag across several/)
      .closest('figure')!
      .querySelectorAll('[data-bar]');
    await user.hover(bars[bars.length - 1]!);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/^14 Nov, 11:\d\d to 1\d:\d\d UTC/);
    expect(tooltip).toHaveTextContent(/\d+ OK/);
    expect(tooltip).toHaveTextContent(/\d+ failed/);
  });

  it('reads the filters from the URL', async () => {
    renderApp('/traces?status=error&sort=slowest&q=checkout');

    const found = await findRows();
    expect(found.every((row) => within(row).queryByText('Error'))).toBe(true);
    expect(statusButton('Error')).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Sort: Slowest first' }),
    ).toBeVisible();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue(
      'checkout',
    );
  });

  it('ignores values in the URL that make no sense', async () => {
    renderApp('/traces?status=banana&minMs=abc&maxMs=-5&page=-2');

    expect(await findRows()).toHaveLength(25);
    expect(screen.getByText('Page 1 of 21')).toBeVisible();
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?q=nothing-like-this&sort=slowest');

    expect(
      await screen.findByText('No traces match these filters'),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await findRows()).toHaveLength(25);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    await waitFor(() => expect(search().get('q')).toBeNull());
    // The sort order is not a filter, so it stays.
    await waitFor(() => expect(search().get('sort')).toBe('slowest'));
  });
});

describe('Traces page pagination', () => {
  it('moves to the next page and puts it in the URL', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('26 to 50 of 503 traces')).toBeVisible();
    expect(screen.getByText('Page 2 of 21')).toBeVisible();
    await waitFor(() => expect(search().get('page')).toBe('2'));
  });

  it('keeps the current rows on screen while the next page loads', async () => {
    // Slows every list request down. Returning nothing passes the request
    // on to the normal handler.
    server.use(
      http.get('/api/traces', async () => {
        await delay(100);
      }),
    );
    const user = userEvent.setup();
    renderApp('/traces');
    await findRows();
    const firstLink = within(rows()[0]!).getByRole('link');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    const results = screen.getByRole('table').parentElement;
    expect(results).toHaveAttribute('aria-busy', 'true');
    expect(firstLink).toBeVisible();

    await waitFor(() => expect(results).toHaveAttribute('aria-busy', 'false'));
    expect(firstLink).not.toBeInTheDocument();
  });

  it('shows the last page when the URL asks for a page beyond it', async () => {
    renderApp('/traces?page=99');

    expect(await findRows()).toHaveLength(3);
    expect(screen.getByText('Page 21 of 21')).toBeVisible();
    expect(screen.getByText('501 to 503 of 503 traces')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('returns to page 1 when a filter changes', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?page=3');
    expect(await screen.findByText('Page 3 of 21')).toBeVisible();

    await user.click(statusButton('OK'));

    expect(await screen.findByText(/^Page 1 of \d+$/)).toBeVisible();
    await waitFor(() => expect(search().get('page')).toBeNull());
  });
});

describe('Traces page states', () => {
  it('shows an error with a Retry button that loads the list again', async () => {
    server.use(
      http.get('/api/traces', () => new HttpResponse(null, { status: 500 }), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    renderApp('/traces');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The traces could not be loaded',
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('table')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error state when the response has the wrong shape', async () => {
    server.use(
      http.get('/api/traces', () => HttpResponse.json({ items: 'nope' })),
    );
    renderApp('/traces');

    expect(await screen.findByRole('alert')).toBeVisible();
  });

  it('shows the error and empty states on demand, from the Simulate control', async () => {
    const user = userEvent.setup();
    renderApp('/traces');
    await findRows();
    // The button says the mode it is in, so it is found by its start.
    const simulate = async (mode: string) => {
      await user.click(screen.getByRole('button', { name: /^Simulate: / }));
      await user.click(
        await screen.findByRole('menuitemradio', { name: mode }),
      );
    };

    await simulate('Server errors');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The traces could not be loaded',
    );
    expect(
      screen.getByRole('button', { name: 'Simulate: Server errors' }),
    ).toBeVisible();

    await simulate('No data');
    expect(await screen.findByText('No traces yet')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument();

    await simulate('Normal');
    expect(await findRows()).toHaveLength(25);
  });
});

describe('Traces page scatter plot', () => {
  it('opens on the scatter plot, and switches to volume without touching the filters or the page', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?status=error&page=2');
    await findRows();

    const failed = dataset.traces.filter((trace) => trace.status === 'error');
    // The scatter plot is the default, so it is not in the URL.
    expect(
      await screen.findByText(
        new RegExp(
          `^${failed.length} traces from .*\\. ${failed.length} failed\\.`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scatter' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(search().get('chart')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Volume' }));

    expect(
      await screen.findByText(/in steps of 30 minutes\. \d+ failed\./),
    ).toBeInTheDocument();
    await waitFor(() => expect(search().get('chart')).toBe('volume'));
    expect(search().get('status')).toBe('error');
    expect(search().get('page')).toBe('2');
  });

  it('opens a trace from its mark', async () => {
    const user = userEvent.setup();
    renderApp('/traces?chart=scatter');

    await screen.findByText(/^\d+ traces from /);
    // The marks are for the pointer, so they are found by their link.
    const mark = document.querySelector(
      `a[href="/traces/${SEEDED_TRACE_IDS.error}"]`,
    )!;

    await user.hover(mark);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('POST /checkout');
    expect(tooltip).toHaveTextContent('640 ms, Error');
    expect(tooltip).toHaveTextContent('Click to open');

    await user.click(mark);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'POST /checkout' }),
    ).toBeVisible();
  });

  it('keeps the plot when a duration is typed in the sidebar', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?chart=scatter');
    await findRows();

    await user.type(minField(), '1000');

    await waitFor(() => expect(search().get('minMs')).toBe('1000'));
    expect(search().get('chart')).toBe('scatter');
    expect(screen.getByRole('button', { name: 'Scatter' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows an error with Retry when the points fail to load', async () => {
    server.use(
      http.get(
        '/api/traces/points',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    renderApp('/traces?chart=scatter');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The chart could not be loaded',
    );
    // The list does not depend on the chart.
    expect(await findRows()).toHaveLength(25);
  });
});

describe('Traces page zoom', () => {
  it('zooms the scatter plot to a dragged span, and Back returns', async () => {
    const { search } = renderApp('/traces?chart=scatter');
    await findRows();
    await screen.findByText(/^\d+ traces from /);

    const plot = screen
      .getByText(/drag across the plot to zoom in/)
      .closest('figure')!
      .querySelector<HTMLElement>('.cursor-crosshair')!;
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 1000, height: 200 }),
    );
    fireEvent.pointerDown(plot, { button: 0, clientX: 600, pointerId: 1 });
    fireEvent.pointerMove(plot, { clientX: 700, pointerId: 1 });
    fireEvent.pointerUp(plot, { clientX: 700, pointerId: 1 });

    await waitFor(() => expect(search().get('from')).not.toBeNull());
    expect(search().get('chart')).toBe('scatter');
    // To the minute, in UTC.
    expect(search().get('from')).toMatch(/^2026-11-1\d \d\d:\d\d$/);
    expect(search().get('to')).toMatch(/^2026-11-1\d \d\d:\d\d$/);

    window.history.back();
    await waitFor(() => expect(search().get('from')).toBeNull());
    expect(search().get('chart')).toBe('scatter');
  });

  it('does not zoom on a plain click, which belongs to the mark', async () => {
    const { search } = renderApp('/traces?chart=scatter');
    await findRows();
    const plot = (await screen.findByText(/drag across the plot to zoom in/))
      .closest('figure')!
      .querySelector<HTMLElement>('.cursor-crosshair')!;
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 1000, height: 200 }),
    );
    fireEvent.pointerDown(plot, { button: 0, clientX: 600, pointerId: 1 });
    fireEvent.pointerUp(plot, { clientX: 601, pointerId: 1 });
    expect(search().get('from')).toBeNull();
  });

  it('puts a new time range in the history, so Back returns', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.click(screen.getByRole('button', { name: 'Time: All time' }));
    await user.click(screen.getByRole('option', { name: 'Last hour' }));
    await waitFor(() => expect(search().get('from')).toBe('now-1h'));

    window.history.back();
    await waitFor(() => expect(search().get('from')).toBeNull());
    expect(
      await screen.findByRole('button', { name: 'Time: All time' }),
    ).toBeVisible();
  });

  it('does not put typing in the history', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();
    const before = window.history.length;

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'login');
    await waitFor(() => expect(search().get('q')).toBe('login'));
    expect(window.history.length).toBe(before);
  });
});

describe('Traces page filter sidebar', () => {
  it('filters by request names checked in a list, with a count beside each', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();
    const count = (...names: string[]) =>
      dataset.traces.filter((trace) => names.includes(trace.operation)).length;
    const logins = count('POST /login');

    await user.click(
      screen.getByRole('checkbox', { name: `POST /login, ${logins} traces` }),
    );

    expect(
      await screen.findByText(
        `1 to ${Math.min(logins, PAGE_SIZE)} of ${logins} traces`,
      ),
    ).toBeVisible();
    expect(
      rows().every((row) =>
        within(row).queryByRole('link', { name: 'POST /login' }),
      ),
    ).toBe(true);
    await waitFor(() =>
      expect(search().getAll('name')).toEqual(['POST /login']),
    );

    // A second name widens the list: a trace matches either.
    await user.click(screen.getByRole('checkbox', { name: /^GET \/orders,/ }));

    const both = count('POST /login', 'GET /orders');
    expect(
      await screen.findByText(
        `1 to ${Math.min(both, PAGE_SIZE)} of ${both} traces`,
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(search().getAll('name')).toEqual(['POST /login', 'GET /orders']),
    );

    await user.click(screen.getByRole('button', { name: 'Clear (2)' }));
    await waitFor(() => expect(search().getAll('name')).toEqual([]));
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toBeChecked();
    }
  });

  it('narrows the names with the search box above them', async () => {
    const user = userEvent.setup();
    renderApp('/traces');
    await findRows();

    await user.type(
      screen.getByRole('searchbox', { name: 'Search names' }),
      'products',
    );

    expect(
      screen.getAllByRole('checkbox').map((box) => box.getAttribute('value')),
    ).toEqual(['GET /products/:id', 'GET /products/search']);
  });

  it('reads several names from the URL and checks them', async () => {
    renderApp('/traces?name=GET%20%2Forders&name=POST%20%2Flogin');
    await findRows();

    expect(
      screen.getByRole('checkbox', { name: /^GET \/orders,/ }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /^POST \/login,/ }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /^POST \/checkout,/ }),
    ).not.toBeChecked();
    expect(
      rows().every((row) =>
        ['GET /orders', 'POST /login'].includes(
          within(row).getAllByRole('link')[0]?.textContent ?? '',
        ),
      ),
    ).toBe(true);
  });

  it('filters by time before the newest data', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.click(screen.getByRole('button', { name: 'Time: All time' }));
    await user.click(screen.getByRole('option', { name: 'Last hour' }));

    await waitFor(() => expect(search().get('from')).toBe('now-1h'));
    expect(search().get('to')).toBe('now');
    expect(
      screen.getByRole('button', { name: 'Time: Last hour' }),
    ).toHaveFocus();
    expect(
      await screen.findByText(/^1 to \d+ of \d+ traces$/),
    ).not.toHaveTextContent('of 503');
  });

  it('applies a custom time range, and says what is wrong with one', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.click(screen.getByRole('button', { name: 'Time: All time' }));
    const from = screen.getByRole('textbox', { name: 'From' });
    const to = screen.getByRole('textbox', { name: 'To' });
    await user.type(from, '2026-11-14 08:00');
    await user.type(to, '2026-11-14 06:00');
    await user.click(screen.getByRole('button', { name: 'Apply time range' }));
    expect(to).toHaveAccessibleDescription(
      /The end must come after the start\./,
    );
    expect(to).toHaveFocus();
    expect(search().get('from')).toBeNull();

    await user.clear(from);
    await user.type(from, '2026-11-14 06:00');
    await user.clear(to);
    await user.type(to, '2026-11-14 08:00');
    await user.click(screen.getByRole('button', { name: 'Apply time range' }));

    await waitFor(() => expect(search().get('from')).toBe('2026-11-14 06:00'));
    expect(
      screen.getByRole('button', {
        name: 'Time: 14 Nov, 06:00 to 08:00 UTC',
      }),
    ).toBeVisible();
  });

  it('folds away, says how many of its filters are on, and remembers it', async () => {
    const user = userEvent.setup();
    renderApp('/traces?minMs=1000&name=GET%20%2Forders');
    await findRows();

    await user.click(screen.getByRole('button', { name: 'Hide filters' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show filters, 2 on' }),
    ).toHaveAttribute('aria-expanded', 'false');

    cleanup();
    renderApp('/traces');
    await findRows();
    expect(screen.getByRole('button', { name: 'Show filters' })).toBeVisible();
  });

  it('is a closed Filters button above the list on a narrow screen', async () => {
    setScreen('phone');
    const user = userEvent.setup();
    renderApp('/traces?minMs=1000');
    await screen.findByText(/^1 to \d+ of \d+ traces$/);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filters (1 on)' }));
    expect(minField()).toHaveValue('1000');
  });

  it('filters by a duration typed as a min and a max, both included', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.type(minField(), '150');
    await user.type(maxField(), '1200');

    const count = countBetween(150, 1200);
    expect(
      await screen.findByText(
        `1 to ${Math.min(count, PAGE_SIZE)} of ${count} traces`,
      ),
    ).toBeVisible();
    await waitFor(() => expect(search().get('minMs')).toBe('150'));
    expect(search().get('maxMs')).toBe('1200');
    // No bar has exactly this range, so none is shown as selected.
    expect(
      screen
        .getAllByRole('button', { pressed: true })
        .filter((button) => / traces?$/.test(button.textContent)),
    ).toEqual([]);
  });

  it('keeps only digits, and an empty field leaves that end open', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.type(minField(), '1a2.5-0');

    expect(minField()).toHaveValue('1250');
    await waitFor(() => expect(search().get('minMs')).toBe('1250'));

    await user.clear(minField());

    expect(minField()).toHaveValue('');
    await waitFor(() => expect(search().get('minMs')).toBeNull());
  });

  it('says so when the max is below the min', async () => {
    const user = userEvent.setup();
    renderApp('/traces');
    await findRows();

    await user.type(minField(), '500');
    await user.type(maxField(), '200');

    expect(maxField()).toBeInvalid();
    expect(maxField()).toHaveAccessibleDescription(
      'The max is below the min, so nothing can match.',
    );
    expect(minField()).toBeValid();
    expect(
      await screen.findByText('No traces match these filters'),
    ).toBeVisible();

    await user.clear(maxField());

    expect(maxField()).toBeValid();
    expect(
      screen.queryByText('The max is below the min, so nothing can match.'),
    ).not.toBeInTheDocument();
  });

  it('reads the duration from the URL', async () => {
    renderApp('/traces?minMs=1000&maxMs=1999');
    await findRows();

    expect(minField()).toHaveValue('1000');
    expect(maxField()).toHaveValue('1999');
    const count = countBetween(1000, 1999);
    expect(
      screen.getByText(`1 to ${Math.min(count, PAGE_SIZE)} of ${count} traces`),
    ).toBeVisible();
  });

  it('clears the duration with Clear filters', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?minMs=500&maxMs=200');

    await user.click(
      await screen.findByRole('button', { name: 'Clear filters' }),
    );

    expect(await findRows()).toHaveLength(25);
    expect(minField()).toHaveValue('');
    expect(maxField()).toHaveValue('');
    await waitFor(() => expect(search().get('minMs')).toBeNull());
  });
});

describe('Traces page reviewed marker', () => {
  it('marks the rows whose suggested cause was decided on, and no others', async () => {
    writeDecisions([
      {
        traceId: SEEDED_TRACE_IDS.error,
        decision: {
          kind: 'rejected',
          originalText: 'The error first appears in payments.',
          finalText: '',
          confidence: 'high',
          basis: 'error reached the request',
          evidenceSpanIds: [],
        },
      },
    ]);
    renderApp('/traces');

    const marker = await screen.findByText('Reviewed');
    const row = marker.closest('tr');
    expect(row).not.toBeNull();
    expect(
      within(row!).getByRole('link', { name: 'POST /checkout' }),
    ).toBeVisible();
    expect(screen.getAllByText('Reviewed')).toHaveLength(1);
  });
});
