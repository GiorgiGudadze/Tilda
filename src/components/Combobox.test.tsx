import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/components/Combobox';

const OPTIONS = [
  { value: '', label: 'All services' },
  { value: 'payments', label: 'payments' },
  { value: 'postgres', label: 'postgres' },
  { value: 'redis', label: 'redis' },
];

function renderCombobox(value = '') {
  const onChange = vi.fn<(value: string) => void>();
  render(
    <Combobox
      label="Service"
      value={value}
      options={OPTIONS}
      onChange={onChange}
    />,
  );
  return { onChange, user: userEvent.setup() };
}

describe('Combobox', () => {
  it('names the button with the label and the chosen option', () => {
    renderCombobox('redis');
    expect(
      screen.getByRole('button', { name: 'Service: redis' }),
    ).toBeVisible();
  });

  it('picks an option with the mouse and closes', async () => {
    const { onChange, user } = renderCombobox();
    await user.click(
      screen.getByRole('button', { name: 'Service: All services' }),
    );
    await user.click(screen.getByRole('option', { name: 'postgres' }));

    expect(onChange).toHaveBeenCalledWith('postgres');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('narrows the list while typing and picks with Enter', async () => {
    const { onChange, user } = renderCombobox();
    await user.click(
      screen.getByRole('button', { name: 'Service: All services' }),
    );
    // The search box has focus as soon as the list opens.
    await user.keyboard('red');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('redis');
  });

  it('says so when nothing matches', async () => {
    const { user } = renderCombobox();
    await user.click(
      screen.getByRole('button', { name: 'Service: All services' }),
    );
    await user.keyboard('zzz');

    expect(screen.getByText('No matches')).toBeVisible();
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('closes on Escape without changing the value', async () => {
    const { onChange, user } = renderCombobox();
    const button = screen.getByRole('button', {
      name: 'Service: All services',
    });
    await user.click(button);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('option')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });
});
