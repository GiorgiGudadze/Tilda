import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Decision } from '@/features/investigation/schemas';
import { readPins, type StoredPin, writePins } from '@/mocks/pins';
import { SEEDED_TRACE_IDS } from '@/mocks/seed';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

/** A stored pin of the failed checkout trace, with anything given changed. */
function checkoutPin(changes: Partial<StoredPin> = {}): StoredPin {
  return {
    traceId: SEEDED_TRACE_IDS.error,
    status: 'open',
    note: '',
    decision: null,
    ...changes,
  };
}

function decision(changes: Partial<Decision>): Decision {
  return {
    kind: 'accepted',
    originalText: 'The error first appears in the card acquirer call.',
    finalText: 'The error first appears in the card acquirer call.',
    confidence: 'high',
    basis: 'error reached the request',
    evidenceSpanIds: ['s10'],
    ...changes,
  };
}

/**
 * Makes every save fail until the handlers are reset. The answer takes a
 * moment, as a real one would, so the change can be seen before it is undone.
 */
function failSaves() {
  server.use(
    http.put('/api/investigation/:traceId', async () => {
      await delay(50);
      return new HttpResponse(null, { status: 500 });
    }),
  );
}

const noteField = () =>
  screen.findByRole('textbox', { name: 'Note for POST /checkout' });
const saveButton = () => screen.getByRole('button', { name: 'Save note' });

describe('Investigation page', () => {
  it('says so when nothing is pinned, with a way to the traces', async () => {
    renderApp('/investigation');

    expect(await screen.findByText('Nothing pinned yet')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to traces' })).toHaveAttribute(
      'href',
      '/traces',
    );
  });

  it('lists the pinned traces, newest pin first, with a link back', async () => {
    writePins([
      checkoutPin(),
      checkoutPin({ traceId: SEEDED_TRACE_IDS.slowQuery, status: 'resolved' }),
    ]);
    renderApp('/investigation');

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);

    const first = within(cards[0]!);
    expect(first.getByRole('link', { name: 'POST /checkout' })).toHaveAttribute(
      'href',
      `/traces/${SEEDED_TRACE_IDS.error}`,
    );
    expect(first.getByText('Open')).toBeVisible();
    expect(first.getByText('No cause recorded yet.')).toBeVisible();

    const second = within(cards[1]!);
    expect(second.getByRole('link', { name: 'GET /orders' })).toBeVisible();
    expect(second.getByText('Resolved')).toBeVisible();
  });

  it('labels each cause with the decision a person made', async () => {
    writePins([
      checkoutPin({ decision: decision({ kind: 'accepted' }) }),
      checkoutPin({
        traceId: SEEDED_TRACE_IDS.slowQuery,
        decision: decision({
          kind: 'edited',
          finalText: 'A missing index on orders.user_id.',
        }),
      }),
      checkoutPin({
        traceId: SEEDED_TRACE_IDS.uncertain,
        decision: decision({ kind: 'rejected', finalText: '' }),
      }),
    ]);
    renderApp('/investigation');

    const cards = await screen.findAllByRole('article');
    expect(cards[0]).toHaveTextContent(
      'The error first appears in the card acquirer call.Accepted by you',
    );
    expect(cards[1]).toHaveTextContent(
      'A missing index on orders.user_id.Edited by you',
    );
    expect(cards[2]).toHaveTextContent(
      'Suggestion rejected, no cause recorded',
    );
    // A rejected suggestion is not shown as a cause.
    expect(cards[2]).not.toHaveTextContent('card acquirer');
  });

  it('shows an error with Retry when the pins cannot be loaded', async () => {
    writePins([checkoutPin()]);
    server.use(
      http.get(
        '/api/investigation',
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    );
    const user = userEvent.setup();
    renderApp('/investigation');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The pinned traces could not be loaded',
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('article')).toBeVisible();
  });
});

describe('Resolving a pin', () => {
  it('marks a pin as resolved, and reopens it', async () => {
    writePins([checkoutPin()]);
    const user = userEvent.setup();
    renderApp('/investigation');

    await user.click(
      await screen.findByRole('button', {
        name: 'Mark as resolved POST /checkout',
      }),
    );

    expect(screen.getByText('Resolved')).toBeVisible();
    await waitFor(() => expect(readPins()[0]?.status).toBe('resolved'));

    await user.click(
      screen.getByRole('button', { name: 'Reopen POST /checkout' }),
    );

    expect(screen.getByText('Open')).toBeVisible();
    await waitFor(() => expect(readPins()[0]?.status).toBe('open'));
  });

  it('undoes the change and says so when the save fails', async () => {
    writePins([checkoutPin()]);
    failSaves();
    const user = userEvent.setup();
    renderApp('/investigation');

    await user.click(
      await screen.findByRole('button', {
        name: 'Mark as resolved POST /checkout',
      }),
    );

    // The change shows before the server answers.
    expect(screen.getByText('Resolved')).toBeVisible();

    expect(
      await screen.findByText(
        'The status could not be changed. It is back as it was.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Open')).toBeVisible();
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
    expect(readPins()[0]?.status).toBe('open');
  });
});

describe('The note of a pin', () => {
  it('is saved with the Save button, not while typing', async () => {
    writePins([checkoutPin()]);
    const user = userEvent.setup();
    renderApp('/investigation');
    const field = await noteField();
    expect(saveButton()).toBeDisabled();

    await user.type(field, 'Acquirer timeouts since 11:50.');

    expect(readPins()[0]?.note).toBe('');
    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());

    expect(await screen.findByText('Saved')).toBeVisible();
    expect(readPins()[0]?.note).toBe('Acquirer timeouts since 11:50.');
    expect(saveButton()).toBeDisabled();
  });

  it('can be cleared, because a note is optional', async () => {
    writePins([checkoutPin({ note: 'Old note' })]);
    const user = userEvent.setup();
    renderApp('/investigation');
    const field = await noteField();
    expect(field).toHaveValue('Old note');

    await user.clear(field);
    await user.click(saveButton());

    expect(await screen.findByText('Saved')).toBeVisible();
    expect(readPins()[0]?.note).toBe('');
  });

  it('is not saved when it is too long, and the field says why', async () => {
    writePins([checkoutPin()]);
    const user = userEvent.setup();
    renderApp('/investigation');
    const field = await noteField();

    await user.click(field);
    await user.paste('x'.repeat(503));

    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription(
      'The note is 3 characters too long. 503 of 500 characters',
    );

    await user.click(saveButton());

    expect(field).toHaveFocus();
    expect(readPins()[0]?.note).toBe('');

    // Back within the limit, the error goes away.
    await user.type(field, '{Backspace}{Backspace}{Backspace}');
    expect(field).toBeValid();
    expect(field).toHaveAccessibleDescription('500 of 500 characters');
  });

  it('keeps the text and offers Retry when the save fails', async () => {
    writePins([checkoutPin()]);
    failSaves();
    const user = userEvent.setup();
    renderApp('/investigation');
    const field = await noteField();

    await user.type(field, 'Do not lose this');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The note was not saved. Your text is still here.',
    );
    expect(field).toHaveValue('Do not lose this');

    // The server recovers, and Retry saves the same text.
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Saved')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(readPins()[0]?.note).toBe('Do not lose this');
  });

  it('is not reset when the pins are loaded again', async () => {
    writePins([checkoutPin({ note: 'Saved text' })]);
    const user = userEvent.setup();
    renderApp('/investigation');
    const field = await noteField();

    await user.type(field, ' and more, not saved yet');
    // Resolving saves the pin and loads the pins again.
    await user.click(
      screen.getByRole('button', { name: 'Mark as resolved POST /checkout' }),
    );
    await waitFor(() => expect(readPins()[0]?.status).toBe('resolved'));
    await screen.findByRole('button', { name: 'Reopen POST /checkout' });

    expect(field).toHaveValue('Saved text and more, not saved yet');
    // Resolving did not save the unsaved text either.
    expect(readPins()[0]?.note).toBe('Saved text');
  });
});

describe('Unpinning from the Investigation page', () => {
  it('removes an empty pin straight away', async () => {
    writePins([checkoutPin()]);
    const user = userEvent.setup();
    renderApp('/investigation');

    await user.click(
      await screen.findByRole('button', { name: 'Unpin POST /checkout' }),
    );

    expect(await screen.findByText('Nothing pinned yet')).toBeVisible();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(readPins()).toEqual([]));
  });

  it('asks first when a note would be lost', async () => {
    writePins([checkoutPin({ note: 'Keep me' })]);
    const user = userEvent.setup();
    renderApp('/investigation');

    await user.click(
      await screen.findByRole('button', { name: 'Unpin POST /checkout' }),
    );

    const dialog = screen.getByRole('alertdialog', {
      name: 'Unpin POST /checkout?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'This deletes its note. It cannot be undone.',
    );

    await user.click(
      within(dialog).getByRole('button', { name: 'Keep it pinned' }),
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(readPins()).toHaveLength(1);

    await user.click(
      screen.getByRole('button', { name: 'Unpin POST /checkout' }),
    );
    await user.click(screen.getByRole('button', { name: 'Unpin and delete' }));

    expect(await screen.findByText('Nothing pinned yet')).toBeVisible();
    await waitFor(() => expect(readPins()).toEqual([]));
  });

  it('asks first when a recorded cause would be lost', async () => {
    writePins([checkoutPin({ note: 'A note', decision: decision({}) })]);
    const user = userEvent.setup();
    renderApp('/investigation');

    await user.click(
      await screen.findByRole('button', { name: 'Unpin POST /checkout' }),
    );

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      'This deletes its note and its recorded cause. It cannot be undone.',
    );
  });

  it('keeps the pin and says so when unpinning fails', async () => {
    writePins([checkoutPin()]);
    server.use(
      http.delete(
        '/api/investigation/:traceId',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderApp('/investigation');

    await user.click(
      await screen.findByRole('button', { name: 'Unpin POST /checkout' }),
    );

    expect(
      await screen.findByText(
        'The trace could not be unpinned. It is still pinned.',
      ),
    ).toBeVisible();
    expect(await screen.findByRole('article')).toBeVisible();
    expect(readPins()).toHaveLength(1);
  });
});
