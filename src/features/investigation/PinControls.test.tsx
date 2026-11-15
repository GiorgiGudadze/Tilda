import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { readPins, writePins } from '@/mocks/pins';
import { SEEDED_TRACE_IDS } from '@/mocks/seed';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

const TRACE_URL = `/traces/${SEEDED_TRACE_IDS.error}`;

describe('Pinning from the trace page', () => {
  it('pins the trace and links to the Investigation page', async () => {
    const user = userEvent.setup();
    renderApp(TRACE_URL);

    await user.click(await screen.findByRole('button', { name: 'Pin trace' }));

    expect(screen.getByText('Pinned')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Pin trace' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(readPins()).toEqual([
        {
          traceId: SEEDED_TRACE_IDS.error,
          status: 'open',
          note: '',
          decision: null,
        },
      ]),
    );

    await user.click(screen.getByRole('link', { name: 'Open investigation' }));

    expect(
      await screen.findByRole('link', { name: 'POST /checkout' }),
    ).toBeVisible();
  });

  it('undoes the pin and says so when the save fails', async () => {
    server.use(
      http.put(
        '/api/investigation/:traceId',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderApp(TRACE_URL);

    await user.click(await screen.findByRole('button', { name: 'Pin trace' }));

    expect(
      await screen.findByText(
        'The trace could not be pinned. Nothing was saved.',
      ),
    ).toBeVisible();
    expect(
      await screen.findByRole('button', { name: 'Pin trace' }),
    ).toBeVisible();
    expect(readPins()).toEqual([]);
  });

  it('shows a trace that is already pinned as pinned, and unpins it', async () => {
    writePins([
      {
        traceId: SEEDED_TRACE_IDS.error,
        status: 'open',
        note: '',
        decision: null,
      },
    ]);
    const user = userEvent.setup();
    renderApp(TRACE_URL);

    await user.click(
      await screen.findByRole('button', { name: 'Unpin POST /checkout' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Pin trace' }),
    ).toBeVisible();
    await waitFor(() => expect(readPins()).toEqual([]));
  });

  it('asks before unpinning a trace that has a note', async () => {
    writePins([
      {
        traceId: SEEDED_TRACE_IDS.error,
        status: 'open',
        note: 'Keep me',
        decision: null,
      },
    ]);
    const user = userEvent.setup();
    renderApp(TRACE_URL);

    await user.click(
      await screen.findByRole('button', { name: 'Unpin POST /checkout' }),
    );

    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(readPins()).toHaveLength(1);
  });
});

describe('Saves that overlap', () => {
  it('keeps a note that is saved while the pin itself is still being saved', async () => {
    // The first save (the pin) is slow. Returning nothing passes each
    // request on to the normal handler.
    let first = true;
    server.use(
      http.put('/api/investigation/:traceId', async () => {
        if (first) {
          first = false;
          await delay(150);
        }
      }),
    );
    const user = userEvent.setup();
    renderApp(TRACE_URL);

    await user.click(await screen.findByRole('button', { name: 'Pin trace' }));
    await user.click(screen.getByRole('link', { name: 'Open investigation' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Note for POST /checkout' }),
      'Written before the pin was saved',
    );
    await user.click(screen.getByRole('button', { name: 'Save note' }));

    expect(await screen.findByText('Saved')).toBeVisible();
    expect(readPins()).toEqual([
      {
        traceId: SEEDED_TRACE_IDS.error,
        status: 'open',
        note: 'Written before the pin was saved',
        decision: null,
      },
    ]);
  });

  it('ends unpinned when a trace is pinned and unpinned at once', async () => {
    let first = true;
    server.use(
      http.put('/api/investigation/:traceId', async () => {
        if (first) {
          first = false;
          await delay(150);
        }
      }),
    );
    const user = userEvent.setup();
    renderApp(TRACE_URL);

    await user.click(await screen.findByRole('button', { name: 'Pin trace' }));
    await user.click(
      screen.getByRole('button', { name: 'Unpin POST /checkout' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Pin trace' }),
    ).toBeVisible();
    // Give the slow pin request time to arrive. It must not win.
    await delay(250);
    expect(readPins()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Pin trace' })).toBeVisible();
  });
});

describe('Pinned traces in the list', () => {
  it('marks the rows of pinned traces', async () => {
    writePins([
      {
        traceId: SEEDED_TRACE_IDS.error,
        status: 'open',
        note: '',
        decision: null,
      },
    ]);
    renderApp('/traces');

    const marker = await screen.findByText('Pinned');
    const row = marker.closest('tr');
    expect(row).not.toBeNull();
    expect(
      within(row!).getByRole('link', { name: 'POST /checkout' }),
    ).toBeVisible();
    expect(screen.getAllByText('Pinned')).toHaveLength(1);
  });
});
