import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEEDED_TRACE_IDS } from '@/mocks/seed';
import { renderApp } from '@/test/render';

describe('Trace page', () => {
  it('shows the summary and one waterfall row per span', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.slowQuery}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'GET /orders' }),
    ).toBeVisible();
    expect(screen.getByText('14 Nov, 11:58:00 UTC')).toBeVisible();
    expect(screen.getByText(SEEDED_TRACE_IDS.slowQuery)).toBeVisible();

    const rows = within(
      screen.getByRole('list', { name: 'Spans' }),
    ).getAllByRole('listitem');
    expect(rows).toHaveLength(8);
    expect(rows[0]).toHaveTextContent('api-gateway GET /orders');
    expect(rows[0]).toHaveTextContent('2.90 s');
    expect(rows[4]).toHaveTextContent(
      'postgres SELECT orders WHERE user_id = ?',
    );
    expect(rows[4]).toHaveTextContent('2.26 s');
  });

  it('marks the failed spans in text', async () => {
    renderApp(`/traces/${SEEDED_TRACE_IDS.error}`);

    const list = await screen.findByRole('list', { name: 'Spans' });
    const failed = within(list)
      .getAllByRole('listitem')
      .filter((row) => row.textContent.includes('failed'));
    expect(failed).toHaveLength(4);
    expect(failed.at(-1)).toHaveTextContent(
      'payments POST card-acquirer /authorize',
    );
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
