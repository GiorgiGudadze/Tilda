import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { formatDuration } from '@/lib/format';
import { queryServiceHealth } from '@/mocks/query-services';
import { createDataset } from '@/mocks/seed';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

const dataset = createDataset();

/** The tile with this label, once it is on screen. */
async function tile(label: string) {
  const term = await screen.findByText(label, { selector: 'dt' });
  return within(term.closest('dl')!);
}

describe('Services page', () => {
  it('shows the first service when none is in the address', async () => {
    renderApp('/services');

    expect(
      await screen.findByRole('button', { name: 'Service: api-gateway' }),
    ).toBeVisible();
    const health = queryServiceHealth(dataset, 'api-gateway', {});
    expect(
      (await tile('Requests')).getByText(String(health.calls)),
    ).toBeVisible();
    expect(
      (await tile('Slowest 5%')).getByText(formatDuration(health.p95Ms!)),
    ).toBeVisible();
    // Requests start at the gateway, so nothing calls it.
    expect(
      screen.getByText('Nothing calls it: requests start here.'),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Traces through api-gateway' }),
    ).toHaveAttribute('href', '/traces?service=api-gateway');
    // The address is left as it was: the first service is a default, not a choice.
    expect(window.location.search).toBe('');
  });

  it('opens the service in the address, with the services on either side of it', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/services?service=postgres');

    expect(
      await screen.findByRole('button', { name: 'Service: postgres' }),
    ).toBeVisible();
    const health = queryServiceHealth(dataset, 'postgres', {});
    expect(health.callers.length).toBeGreaterThan(1);
    expect(
      await screen.findByText('It calls nothing: it does the work itself.'),
    ).toBeVisible();

    // A caller opens its own page.
    await user.click(
      screen.getByRole('link', { name: health.callers[0]!.service }),
    );

    await waitFor(() =>
      expect(search().get('service')).toBe(health.callers[0]!.service),
    );
    expect(
      await screen.findByRole('button', {
        name: `Service: ${health.callers[0]!.service}`,
      }),
    ).toBeVisible();
  });

  it('keeps the time range, counts within it, and passes it on to the traces', async () => {
    renderApp('/services?service=orders&from=now-6h&to=now');

    expect(
      await screen.findByRole('button', { name: 'Time: Last 6 hours' }),
    ).toBeVisible();
    const health = queryServiceHealth(dataset, 'orders', {
      from: 'now-6h',
      to: 'now',
    });
    const all = queryServiceHealth(dataset, 'orders', {});
    expect(health.calls).toBeLessThan(all.calls);
    expect(
      (await tile('Requests')).getByText(String(health.calls)),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Traces through orders' }),
    ).toHaveAttribute('href', '/traces?from=now-6h&to=now&service=orders');
  });

  it('changes the address when a service is picked', async () => {
    const user = userEvent.setup();
    const { search } = renderApp('/services');

    await user.click(
      await screen.findByRole('button', { name: 'Service: api-gateway' }),
    );
    await user.click(await screen.findByRole('option', { name: 'redis' }));

    await waitFor(() => expect(search().get('service')).toBe('redis'));
    expect(
      await screen.findByRole('button', { name: 'Service: redis' }),
    ).toBeVisible();
    expect(
      (await tile('Requests')).getByText(
        String(queryServiceHealth(dataset, 'redis', {}).calls),
      ),
    ).toBeVisible();
  });

  it('says so for a service that does not exist', async () => {
    renderApp('/services?service=mainframe');

    expect(
      await screen.findByText('There is no service called mainframe'),
    ).toBeVisible();
    // It can still be picked from.
    expect(
      screen.getByRole('button', { name: 'Service: mainframe' }),
    ).toBeVisible();
  });

  it('shows an error with Retry when the service cannot be loaded', async () => {
    server.use(
      http.get(
        '/api/services/:name/health',
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    );
    const user = userEvent.setup();
    renderApp('/services?service=redis');

    expect(
      await screen.findByText('The service could not be loaded'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      (await tile('Requests')).getByText(
        String(queryServiceHealth(dataset, 'redis', {}).calls),
      ),
    ).toBeVisible();
  });
});
