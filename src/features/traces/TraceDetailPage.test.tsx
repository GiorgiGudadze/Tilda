import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEEDED_TRACE_IDS } from '@/mocks/seed';
import { renderApp } from '@/test/render';

// Rows of the hand-written slow trace, by their accessible name.
const ROOT = 'api-gateway, GET /orders, 2.90 s, OK';
const ORDERS = 'orders, list orders, 2.84 s, OK';
const SLOW_QUERY =
  'postgres, SELECT orders WHERE user_id = ?, 2.26 s, OK, slowest span';

/** The spans as buttons, in the order they are shown. */
async function findRowNames() {
  const list = await screen.findByRole('list', { name: 'Spans' });
  return within(list)
    .getAllByRole('button')
    .map((row) => row.querySelector('.sr-only')?.textContent);
}

describe('Trace page', () => {
  it('shows the summary and one waterfall row per span', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'GET /orders' }),
    ).toBeVisible();
    expect(screen.getByText('14 Nov, 11:58:00 UTC')).toBeVisible();
    expect(screen.getByText(SEEDED_TRACE_IDS.slowQuery)).toBeVisible();

    expect(await findRowNames()).toEqual([
      ROOT,
      'auth, verify token, 36 ms, OK',
      'redis, GET session, 4 ms, OK',
      ORDERS,
      SLOW_QUERY,
      'postgres, SELECT order_items WHERE order_id IN (?), 48 ms, OK',
      'inventory, POST /stock/lookup, 220 ms, OK',
      'postgres, SELECT stock WHERE sku IN (?), 190 ms, OK',
    ]);
  });

  it('names each row with its service, operation, duration and status', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.error}`);

    const names = await findRowNames();
    expect(names.filter((name) => name?.includes(', failed'))).toEqual([
      'api-gateway, POST /checkout, 640 ms, failed',
      'orders, create order, 596 ms, failed',
      'payments, charge card, 454 ms, failed',
      'payments, POST card-acquirer /authorize, 414 ms, failed, slowest span',
    ]);
  });

  it('marks exactly one span as the slowest', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.uncertain}`);

    const names = await findRowNames();
    expect(names.filter((name) => name?.includes('slowest span'))).toEqual([
      'postgres, SELECT products WHERE name ILIKE ?, 290 ms, OK, slowest span',
    ]);
  });

  it('says so when the trace does not exist', async () => {
    renderApp('/traces/does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Trace not found' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to traces' })).toBeVisible();
  });

  it('shows a Not found page for an unknown address', async () => {
    renderApp('/nope');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeVisible();
  });
});

describe('Span details', () => {
  it('opens under a row, puts the span in the URL, and closes again', async () => {
    const user = userEvent.setup();
    const { search } = renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}`);
    const row = await screen.findByRole('button', { name: SLOW_QUERY });
    expect(row).toHaveAttribute('aria-expanded', 'false');

    await user.click(row);

    expect(row).toHaveAttribute('aria-expanded', 'true');
    const details = document.getElementById(
      row.getAttribute('aria-controls') ?? '',
    );
    expect(details).toHaveTextContent('Self time2.26 s, 78% of the trace');
    expect(details).toHaveTextContent('Starts at60 ms');
    expect(details).toHaveTextContent('Child spans0');
    expect(details).toHaveTextContent(
      'This span has the largest self time in the trace.',
    );
    await waitFor(() => expect(search().get('span')).toBe('s5'));

    await user.click(row);

    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Self time')).not.toBeInTheDocument();
    await waitFor(() => expect(search().get('span')).toBeNull());
  });

  it('shows self time without the time of the child spans', async () => {
    const user = userEvent.setup();
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}`);

    await user.click(await screen.findByRole('button', { name: ORDERS }));

    // 2,842 ms long, of which 2,530 ms is spent in its three children.
    expect(screen.getByText('312 ms, 11% of the trace')).toBeVisible();
    expect(screen.getByText('Child spans').nextSibling).toHaveTextContent('3');
  });

  it('opens one span at a time', async () => {
    const user = userEvent.setup();
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}`);

    await user.click(await screen.findByRole('button', { name: SLOW_QUERY }));
    await user.click(screen.getByRole('button', { name: ORDERS }));

    expect(screen.getByRole('button', { name: ORDERS })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: SLOW_QUERY })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getAllByText('Self time')).toHaveLength(1);
  });

  it('opens the span named in the URL', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}?span=s5`);

    expect(
      await screen.findByRole('button', { name: SLOW_QUERY }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('2.26 s, 78% of the trace')).toBeVisible();
  });

  it('opens nothing when the URL names a span that is not in the trace', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}?span=nope`);

    await screen.findByRole('button', { name: SLOW_QUERY });
    expect(screen.queryByText('Self time')).not.toBeInTheDocument();
  });

  it('moves to the parent span from the details', async () => {
    const user = userEvent.setup();
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}?span=s5`);
    await screen.findByRole('button', { name: SLOW_QUERY });

    await user.click(
      screen.getByRole('button', { name: 'orders: list orders' }),
    );

    expect(screen.getByRole('button', { name: ORDERS })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    // The root span has no parent to move to.
    await user.click(
      screen.getByRole('button', { name: 'api-gateway: GET /orders' }),
    );
    expect(screen.getByRole('button', { name: ROOT })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      screen.getByText('None. This is the first span of the trace.'),
    ).toBeVisible();
  });
});
