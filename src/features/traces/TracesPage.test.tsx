import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

describe('Traces page', () => {
  it('redirects the home page to the list of traces', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Traces' }),
    ).toBeVisible();
  });

  it('lists the newest traces with their status and duration', async () => {
    renderApp('/traces');

    expect(screen.getByText('Loading traces…')).toBeVisible();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    // One header row and one page of traces.
    expect(rows).toHaveLength(26);
    expect(screen.getByText(/of 153 traces/)).toBeVisible();

    const newest = within(rows[1]!);
    expect(newest.getByRole('link', { name: 'GET /orders' })).toBeVisible();
    expect(newest.getByText('2.90 s')).toBeVisible();
    expect(newest.getByText('OK')).toBeVisible();

    const failed = within(rows[2]!);
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

  it('shows an error with a Retry button that loads the list again', async () => {
    server.use(
      http.get('/api/traces', () => new HttpResponse(null, { status: 500 }), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    renderApp('/traces');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The traces could not be loaded.',
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
});
