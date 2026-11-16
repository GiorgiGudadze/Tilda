import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TraceId } from '@/components/TraceId';

const ID = 'a1b2c3d4e5f60001';

describe('TraceId', () => {
  it('keeps the whole ID in the page, read once', () => {
    render(<TraceId id={ID} />);
    // The copy shown on hover is hidden from screen readers.
    expect(screen.getAllByText(ID)).toHaveLength(2);
    expect(
      screen.getByText(ID, { ignore: '[aria-hidden="true"]' }),
    ).toHaveClass('truncate');
  });

  it('copies the ID, and says so', async () => {
    // Set up first: it puts a clipboard of its own on the page.
    const user = userEvent.setup();
    render(<TraceId id={ID} />);

    await user.click(screen.getByRole('button', { name: 'Copy trace ID' }));

    expect(await navigator.clipboard.readText()).toBe(ID);
    expect(screen.getByText('Trace ID copied')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Copied');
  });

  it('says when the clipboard refuses', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('Denied'),
    );
    render(<TraceId id={ID} />);

    await user.click(screen.getByRole('button', { name: 'Copy trace ID' }));

    expect(
      await screen.findByText('Could not copy the trace ID'),
    ).toHaveAttribute('aria-live', 'polite');
  });
});
