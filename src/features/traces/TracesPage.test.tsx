import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { formatDuration } from '@/lib/format';
import { createDataset } from '@/mocks/seed';
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
    expect(screen.getByText('1 to 25 of 153 traces')).toBeVisible();

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

    expect(await screen.findAllByRole('listitem')).toHaveLength(25);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'GET /orders' })[0],
    ).toBeVisible();
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
  it('filters by status and puts it in the URL', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'Error',
    );

    await waitFor(() => {
      expect(rows().every((row) => within(row).queryByText('Error'))).toBe(
        true,
      );
    });
    await waitFor(() => expect(search().get('status')).toBe('error'));
  });

  it('filters by a service that took part in the trace', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await screen.findByRole('option', { name: 'payments' });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Service' }),
      'payments',
    );

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

  it('sorts by duration, slowest first', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort' }),
      'Slowest first',
    );

    const slowest = Math.max(...dataset.traces.map((t) => t.durationMs));
    await waitFor(() => {
      expect(
        within(rows()[0]!).getByText(formatDuration(slowest)),
      ).toBeVisible();
    });
    await waitFor(() => expect(search().get('sort')).toBe('slowest'));
  });

  it('filters by a bar of the chart, and clears it with a second click', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces');
    await findRows();

    const bar = screen.getByRole('button', { name: /^2 to 3 s, \d+ traces$/ });
    const count = Number(/, (\d+) traces/.exec(bar.textContent)?.[1]);
    expect(count).toBeGreaterThan(0);
    expect(bar).toHaveAttribute('aria-pressed', 'false');

    await user.click(bar);

    expect(
      await screen.findByText(`1 to ${count} of ${count} traces`),
    ).toBeVisible();
    expect(bar).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(search().get('duration')).toBe('2-3s'));
    // The other bars keep their counts, so another range can be picked.
    expect(
      screen.getByRole('button', { name: /^Under 100 ms, [1-9]\d* traces$/ }),
    ).toBeEnabled();

    await user.click(bar);

    expect(await screen.findByText('1 to 25 of 153 traces')).toBeVisible();
    expect(bar).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(search().get('duration')).toBeNull());
  });

  it('reads the filters from the URL', async () => {
    renderApp('/traces?status=error&sort=slowest&q=checkout');

    const found = await findRows();
    expect(found.every((row) => within(row).queryByText('Error'))).toBe(true);
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue(
      'error',
    );
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue(
      'slowest',
    );
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue(
      'checkout',
    );
  });

  it('ignores values in the URL that make no sense', async () => {
    renderApp('/traces?status=banana&duration=nope&page=-2');

    expect(await findRows()).toHaveLength(25);
    expect(screen.getByText('Page 1 of 7')).toBeVisible();
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

    expect(await screen.findByText('26 to 50 of 153 traces')).toBeVisible();
    expect(screen.getByText('Page 2 of 7')).toBeVisible();
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
    expect(screen.getByText('Page 7 of 7')).toBeVisible();
    expect(screen.getByText('151 to 153 of 153 traces')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('returns to page 1 when a filter changes', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/traces?page=3');
    expect(await screen.findByText('Page 3 of 7')).toBeVisible();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'OK',
    );

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

  it('shows the error and empty states on demand, from the Demo control', async () => {
    const user = userEvent.setup();
    renderApp('/traces');
    await findRows();
    const demo = screen.getByRole('combobox', { name: 'Demo' });

    await user.selectOptions(demo, 'Server errors');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The traces could not be loaded',
    );

    await user.selectOptions(demo, 'No data');
    expect(await screen.findByText('No traces yet')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(demo, 'Normal');
    expect(await findRows()).toHaveLength(25);
  });
});
