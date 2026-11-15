import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Decision } from '@/features/investigation/schemas';
import { readPins, writePins } from '@/mocks/pins';
import { createDataset, SEEDED_TRACE_IDS } from '@/mocks/seed';
import { suggestCause } from '@/mocks/suggest';
import { renderApp } from '@/test/render';
import { server } from '@/test/server';

const SLOW_TRACE = SEEDED_TRACE_IDS.slowQuery;
const SLOW_TEXT =
  'Most of the time is spent in postgres: SELECT orders WHERE user_id = ?: 2.26 s of 2.90 s, not counting its child spans.';
const SLOW_QUERY_ROW =
  'postgres, SELECT orders WHERE user_id = ?, 2.26 s, OK, slowest span';
const EVIDENCE_ROW = `${SLOW_QUERY_ROW}, evidence for the suggested cause`;

/** The AI's suggestion for the slow trace, as an accepted decision. */
const ACCEPTED: Decision = {
  kind: 'accepted',
  originalText: SLOW_TEXT,
  finalText: SLOW_TEXT,
  confidence: 'high',
  basis: '78% of trace time',
  evidenceSpanIds: ['s5'],
};

/** Opens the page of a pinned trace, with a decision if one is given. */
function openPinned(traceId: string, decision: Decision | null = null) {
  writePins([{ traceId, status: 'open', note: '', decision }]);
  return renderApp(`/traces/${traceId}`);
}

const storedDecision = () => readPins()[0]?.decision;
const panel = () => screen.findByRole('region', { name: /cause/i });
const button = (name: string) => screen.getByRole('button', { name });

/** Asks for a suggestion and waits until it can be reviewed. */
async function suggest(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('button', { name: 'Suggest cause' }),
  );
  await screen.findByRole('button', { name: 'Edit' });
}

/** A response made of these lines. It stays open when `open` is true. */
function streamOf(
  lines: object[],
  { open = false, onCancel }: { open?: boolean; onCancel?: () => void } = {},
) {
  const encoder = new TextEncoder();
  return new HttpResponse(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        }
        if (!open) controller.close();
      },
      cancel() {
        onCancel?.();
      },
    }),
  );
}

const META = {
  type: 'meta',
  outcome: {
    kind: 'finding',
    confidence: 'high',
    basis: 'a test',
    evidenceSpanIds: ['s5'],
  },
};

describe('The suggestion panel', () => {
  it('is not there until the trace is pinned', async () => {
    const user = userEvent.setup();
    renderApp(`/traces/${SLOW_TRACE}`);
    const pin = await screen.findByRole('button', { name: 'Pin trace' });
    expect(
      screen.queryByRole('button', { name: 'Suggest cause' }),
    ).not.toBeInTheDocument();

    await user.click(pin);

    expect(button('Suggest cause')).toBeVisible();
  });

  it('streams a suggestion with its confidence, basis and evidence', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);

    await suggest(user);

    const region = within(await panel());
    expect(
      region.getByRole('heading', { name: 'Suggested cause' }),
    ).toBeVisible();
    expect(region.getByText(SLOW_TEXT)).toBeVisible();
    expect(region.getByText('High confidence')).toBeVisible();
    expect(region.getByText('Based on: 78% of trace time')).toBeVisible();
    expect(
      region.getByRole('button', {
        name: 'postgres: SELECT orders WHERE user_id = ?',
      }),
    ).toBeVisible();
    // Accepting is the main action when the AI is sure.
    expect(button('Accept')).toHaveAttribute('data-variant', 'default');
    expect(button('Edit')).toHaveAttribute('data-variant', 'outline');
    // Nothing is on record until a person decides.
    expect(storedDecision()).toBeNull();
  });

  it('marks the evidence in the waterfall, and links to it', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    expect(
      await screen.findByRole('button', { name: SLOW_QUERY_ROW }),
    ).toBeVisible();

    await suggest(user);

    const row = button(EVIDENCE_ROW);
    expect(row).toHaveAttribute('aria-expanded', 'false');

    await user.click(button('postgres: SELECT orders WHERE user_id = ?'));

    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(row).toHaveFocus();
  });

  it('announces the suggestion once, when it is complete', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);

    await suggest(user);

    const announcer = (await panel()).querySelector('[aria-live="polite"]');
    expect(announcer).toHaveTextContent(`Suggestion ready. ${SLOW_TEXT}`);
  });

  it('makes Edit the main action when confidence is low', async () => {
    const user = userEvent.setup();
    openPinned(SEEDED_TRACE_IDS.uncertain);

    await suggest(user);

    expect(screen.getByText('Low confidence')).toBeVisible();
    expect(
      screen.getByText('Based on: largest span is 18% of trace time'),
    ).toBeVisible();
    expect(button('Edit')).toHaveAttribute('data-variant', 'default');
    expect(button('Accept')).toHaveAttribute('data-variant', 'outline');
  });
});

describe('Deciding about a suggestion', () => {
  it('records an accepted suggestion as the cause', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await suggest(user);

    await user.click(button('Accept'));

    const region = within(await panel());
    expect(region.getByRole('heading', { name: 'Cause' })).toBeVisible();
    expect(region.getByText(SLOW_TEXT)).toBeVisible();
    expect(region.getByText('Accepted by you')).toBeVisible();
    expect(region.getByText('High confidence')).toBeVisible();
    expect(
      region.getByRole('button', { name: 'Change decision' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Accept' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(storedDecision()).toEqual(ACCEPTED));
    // The evidence stays marked: the accepted cause rests on it.
    expect(button(EVIDENCE_ROW)).toBeVisible();
  });

  it('records an edited cause and keeps what the AI wrote', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await suggest(user);

    await user.click(button('Edit'));
    const field = screen.getByRole('textbox', { name: 'Cause' });
    expect(field).toHaveValue(SLOW_TEXT);
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, 'A missing index on orders.user_id.');
    await user.click(button('Save cause'));

    const region = within(await panel());
    expect(
      region.getByText('A missing index on orders.user_id.'),
    ).toBeVisible();
    expect(region.getByText('Edited by you')).toBeVisible();
    // The AI's confidence is about the AI's text, so it is not beside the
    // user's own cause.
    expect(region.queryByText('High confidence')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(storedDecision()).toEqual({
        ...ACCEPTED,
        kind: 'edited',
        finalText: 'A missing index on orders.user_id.',
      }),
    );
    // The AI's evidence is not marked for a cause the user wrote.
    expect(button(SLOW_QUERY_ROW)).toBeVisible();

    const toggle = region.getByRole('button', {
      name: 'View original AI text',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(region.getByText(SLOW_TEXT)).toBeVisible();
    expect(region.getByText('High confidence')).toBeVisible();
  });

  it('does not save an empty or too long cause, and the field says why', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await suggest(user);
    await user.click(button('Edit'));
    const field = screen.getByRole('textbox', { name: 'Cause' });

    await user.clear(field);
    // No error yet: it shows after the first try to save.
    expect(field).toHaveAttribute('aria-invalid', 'false');
    await user.click(button('Save cause'));

    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription(
      'Write a cause, or cancel. 0 of 300 characters',
    );
    expect(field).toHaveFocus();

    await user.paste('x'.repeat(302));

    expect(field).toHaveAccessibleDescription(
      'The cause is 2 characters too long. 302 of 300 characters',
    );
    await user.click(button('Save cause'));
    expect(storedDecision()).toBeNull();

    await user.click(button('Cancel'));

    expect(button('Accept')).toBeVisible();
    expect(
      screen.queryByRole('textbox', { name: 'Cause' }),
    ).not.toBeInTheDocument();
  });

  it('records the AI text saved unchanged as accepted, not edited', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await suggest(user);

    await user.click(button('Edit'));
    await user.click(button('Save cause'));

    expect(await screen.findByText('Accepted by you')).toBeVisible();
    await waitFor(() => expect(storedDecision()).toEqual(ACCEPTED));
  });

  it('records a rejection with no cause', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await suggest(user);

    await user.click(button('Reject'));

    const region = within(await panel());
    expect(
      region.getByText('Suggestion rejected, no cause recorded'),
    ).toBeVisible();
    // A rejected suggestion is not shown as the cause.
    expect(region.queryByText(SLOW_TEXT)).not.toBeInTheDocument();
    expect(button(SLOW_QUERY_ROW)).toBeVisible();
    await waitFor(() =>
      expect(storedDecision()).toEqual({
        ...ACCEPTED,
        kind: 'rejected',
        finalText: '',
      }),
    );
  });

  it('undoes the decision and says so when it cannot be saved', async () => {
    server.use(
      http.put('/api/investigation/:traceId', async () => {
        await delay(50);
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await suggest(user);

    await user.click(button('Accept'));
    expect(screen.getByText('Accepted by you')).toBeVisible();

    expect(
      await screen.findByText(
        'The decision could not be saved. Nothing was recorded.',
      ),
    ).toBeVisible();
    // The suggestion is back for review, without asking the AI again.
    expect(button('Accept')).toBeVisible();
    expect(screen.queryByText('Accepted by you')).not.toBeInTheDocument();
    expect(storedDecision()).toBeNull();
  });
});

describe('A trace with nothing wrong', () => {
  // A generated trace that is not slow and has no failed span.
  const dataset = createDataset();
  const healthy = dataset.traces.find(
    (trace) =>
      suggestCause(dataset.spansByTraceId.get(trace.id) ?? []).outcome.kind ===
      'no-finding',
  );
  const MESSAGE =
    'Nothing looks wrong with this trace. It was not slow and no span failed.';

  it('offers only to write a cause, and stores it as edited', async () => {
    const user = userEvent.setup();
    openPinned(healthy!.id);

    await user.click(
      await screen.findByRole('button', { name: 'Suggest cause' }),
    );

    // Wait for the finished suggestion, not the text while it arrives.
    await screen.findByRole('button', { name: 'Write a cause yourself' });
    expect(screen.getByText(MESSAGE)).toBeVisible();
    expect(screen.queryByText(/confidence/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Accept' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject' }),
    ).not.toBeInTheDocument();

    await user.click(button('Write a cause yourself'));
    const field = screen.getByRole('textbox', { name: 'Cause' });
    expect(field).toHaveValue('');
    await user.type(field, 'The client timed out before we answered.');
    await user.click(button('Save cause'));

    expect(await screen.findByText('Edited by you')).toBeVisible();
    await waitFor(() =>
      expect(storedDecision()).toEqual({
        kind: 'edited',
        originalText: MESSAGE,
        finalText: 'The client timed out before we answered.',
        confidence: null,
        basis: null,
        evidenceSpanIds: [],
      }),
    );
  });
});

describe('A suggestion that does not arrive', () => {
  it('shows an error with Retry when the request fails', async () => {
    server.use(
      http.post(
        '/api/traces/:id/suggestion',
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);

    await user.click(
      await screen.findByRole('button', { name: 'Suggest cause' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The suggestion could not be loaded. Nothing was recorded.',
    );

    await user.click(button('Retry'));

    await screen.findByRole('button', { name: 'Accept' });
    expect(screen.getByText(SLOW_TEXT)).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is an error when the stream is cut off before it is done', async () => {
    server.use(
      http.post('/api/traces/:id/suggestion', () =>
        streamOf([META, { type: 'text', text: 'Most of the' }]),
      ),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);

    await user.click(
      await screen.findByRole('button', { name: 'Suggest cause' }),
    );

    expect(await screen.findByRole('alert')).toBeVisible();
    // Half a suggestion is not offered for a decision.
    expect(
      screen.queryByRole('button', { name: 'Accept' }),
    ).not.toBeInTheDocument();
  });

  it('is an error when a line of the stream has the wrong shape', async () => {
    server.use(
      http.post('/api/traces/:id/suggestion', () =>
        streamOf([
          { type: 'meta', outcome: { kind: 'guess' } },
          { type: 'done' },
        ]),
      ),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);

    await user.click(
      await screen.findByRole('button', { name: 'Suggest cause' }),
    );

    expect(await screen.findByRole('alert')).toBeVisible();
  });

  it('stops when the user asks, and can be asked again', async () => {
    server.use(
      http.post(
        '/api/traces/:id/suggestion',
        () =>
          streamOf([META, { type: 'text', text: 'Most of the' }], {
            open: true,
          }),
        { once: true },
      ),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);

    await user.click(
      await screen.findByRole('button', { name: 'Suggest cause' }),
    );
    expect(await screen.findByText('Most of the')).toBeVisible();
    // A suggestion that is still arriving cannot be decided on.
    expect(
      screen.queryByRole('button', { name: 'Accept' }),
    ).not.toBeInTheDocument();

    await user.click(button('Stop'));

    expect(screen.getByText('The suggestion was stopped.')).toBeVisible();
    expect(screen.queryByText('Most of the')).not.toBeInTheDocument();

    await user.click(button('Suggest cause'));

    await screen.findByRole('button', { name: 'Accept' });
    expect(screen.getByText(SLOW_TEXT)).toBeVisible();
  });

  it('ends the request when the user leaves the page', async () => {
    let cancelled = false;
    server.use(
      http.post('/api/traces/:id/suggestion', () =>
        streamOf([META, { type: 'text', text: 'Most of the' }], {
          open: true,
          onCancel: () => {
            cancelled = true;
          },
        }),
      ),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE);
    await user.click(
      await screen.findByRole('button', { name: 'Suggest cause' }),
    );
    await screen.findByText('Most of the');

    await user.click(screen.getByRole('link', { name: 'Back to traces' }));

    await waitFor(() => expect(cancelled).toBe(true));
  });
});

describe('Changing a decision', () => {
  it('shows the stored suggestion again, without asking the AI', async () => {
    let requests = 0;
    server.use(
      http.post('/api/traces/:id/suggestion', () => {
        requests += 1;
      }),
    );
    const user = userEvent.setup();
    openPinned(SLOW_TRACE, ACCEPTED);

    await user.click(
      await screen.findByRole('button', { name: 'Change decision' }),
    );

    const region = within(await panel());
    expect(
      region.getByRole('heading', { name: 'Suggested cause' }),
    ).toBeVisible();
    expect(region.getByText(SLOW_TEXT)).toBeVisible();
    expect(region.getByText('Based on: 78% of trace time')).toBeVisible();
    expect(requests).toBe(0);

    await user.click(button('Reject'));

    expect(
      await screen.findByText('Suggestion rejected, no cause recorded'),
    ).toBeVisible();
    await waitFor(() => expect(storedDecision()?.kind).toBe('rejected'));
    expect(requests).toBe(0);
  });

  it('can leave the decision as it is', async () => {
    const user = userEvent.setup();
    openPinned(SLOW_TRACE, ACCEPTED);

    await user.click(
      await screen.findByRole('button', { name: 'Change decision' }),
    );
    await user.click(button('Keep the current decision'));

    expect(screen.getByText('Accepted by you')).toBeVisible();
    expect(storedDecision()).toEqual(ACCEPTED);
  });

  it('shows a decision made earlier when the page is opened', async () => {
    openPinned(SLOW_TRACE, ACCEPTED);

    expect(await screen.findByText('Accepted by you')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Suggest cause' }),
    ).not.toBeInTheDocument();
    expect(button(EVIDENCE_ROW)).toBeVisible();
  });
});
