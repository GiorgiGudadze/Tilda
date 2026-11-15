import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEEDED_TRACE_IDS } from '@/mocks/seed';
import { renderApp } from '@/test/render';

const heading = (name: string) =>
  screen.findByRole('heading', { level: 1, name });

describe('Going to another page', () => {
  it('moves focus to the heading of the new page', async () => {
    const user = userEvent.setup();
    renderApp('/traces');

    await user.click(screen.getByRole('link', { name: 'Investigation' }));

    expect(await heading('Investigation')).toHaveFocus();
  });

  it('keeps focus on the heading while the new page loads its data', async () => {
    const user = userEvent.setup();
    renderApp('/traces');

    const links = await screen.findAllByRole('link', { name: 'GET /orders' });
    await user.click(links[0]!);

    // "Trace" while loading, then the name of the request: the same heading.
    expect(await heading('GET /orders')).toHaveFocus();

    await user.click(screen.getByRole('link', { name: 'Back to traces' }));

    expect(await heading('Traces')).toHaveFocus();
  });

  it('leaves focus alone on the first page', async () => {
    renderApp('/');

    expect(await heading('Traces')).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('leaves focus alone when only the filters change', async () => {
    const user = userEvent.setup();
    renderApp('/traces');
    await screen.findByRole('table');
    const status = screen.getByRole('combobox', { name: 'Status' });

    await user.selectOptions(status, 'Error');
    await waitFor(() => expect(window.location.search).toContain('status'));

    expect(status).toHaveFocus();
  });
});

describe('The browser tab', () => {
  it.each([
    ['/traces', 'Traces · Trace Investigator'],
    ['/investigation', 'Investigation · Trace Investigator'],
    ['/design', 'Design · Trace Investigator'],
    ['/nope', 'Page not found · Trace Investigator'],
    ['/traces/does-not-exist', 'Trace not found · Trace Investigator'],
    [
      `/traces/${SEEDED_TRACE_IDS.error}`,
      'POST /checkout · Trace Investigator',
    ],
  ])('names the page at %s', async (path, title) => {
    renderApp(path);

    await waitFor(() => expect(document.title).toBe(title));
  });
});
