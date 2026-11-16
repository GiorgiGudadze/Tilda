import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import type { TimeRange } from '@/lib/time-range';

function setup(value: TimeRange | null = null) {
  const onChange = vi.fn<(range: TimeRange | null) => void>();
  render(<TimeRangePicker value={value} onChange={onChange} />);
  return { user: userEvent.setup(), onChange };
}

describe('TimeRangePicker', () => {
  it('says the range in its name', () => {
    setup({ from: 'now-6h', to: 'now' });
    expect(
      screen.getByRole('button', { name: 'Time: Last 6 hours' }),
    ).toBeVisible();
  });

  it('applies a quick range found by typing', async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Time: All time' }));
    await user.type(
      screen.getByRole('combobox', { name: 'Quick ranges' }),
      '12',
    );
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith({ from: 'now-12h', to: 'now' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('goes back to all time', async () => {
    const { user, onChange } = setup({ from: 'now-1h', to: 'now' });
    await user.click(screen.getByRole('button', { name: 'Time: Last hour' }));
    await user.click(screen.getByRole('option', { name: 'All time' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('opens the form with the current range, and applies an edit', async () => {
    const { user, onChange } = setup({ from: 'now-6h', to: 'now' });
    await user.click(
      screen.getByRole('button', { name: 'Time: Last 6 hours' }),
    );
    const from = screen.getByRole('textbox', { name: 'From' });
    expect(from).toHaveValue('now-6h');
    await user.clear(from);
    await user.type(from, 'now-2h');
    await user.click(screen.getByRole('button', { name: 'Apply time range' }));
    expect(onChange).toHaveBeenCalledWith({ from: 'now-2h', to: 'now' });
  });

  it('names a field that is empty or not a time, and applies nothing', async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Time: All time' }));
    await user.type(screen.getByRole('textbox', { name: 'From' }), 'yesterday');
    await user.click(screen.getByRole('button', { name: 'Apply time range' }));

    const from = screen.getByRole('textbox', { name: 'From' });
    expect(from).toHaveAttribute('aria-invalid', 'true');
    expect(from).toHaveAccessibleDescription(/^Not a time\./);
    expect(from).toHaveFocus();
    expect(
      screen.getByRole('textbox', { name: 'To' }),
    ).toHaveAccessibleDescription(/^Enter an end\./);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the range when closed with Escape', async () => {
    const { user, onChange } = setup({ from: 'now-6h', to: 'now' });
    const button = screen.getByRole('button', { name: 'Time: Last 6 hours' });
    await user.click(button);
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });
});
