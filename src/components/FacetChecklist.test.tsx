import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FacetChecklist, type FacetOption } from '@/components/FacetChecklist';

const OPTIONS: FacetOption[] = [
  { value: 'GET /orders', label: 'GET /orders', count: 114 },
  { value: 'GET /products/:id', label: 'GET /products/:id', count: 99 },
  { value: 'POST /checkout', label: 'POST /checkout', count: 0 },
  { value: 'POST /login', label: 'POST /login', count: 1 },
];

/** The checklist with its own state, as a page would hold it. */
function Checklist({ initial = [] }: { initial?: string[] }) {
  const [values, setValues] = useState(initial);
  return (
    <>
      <FacetChecklist
        label="Name"
        searchNoun="names"
        values={values}
        options={OPTIONS}
        onChange={setValues}
      />
      <output>{values.join(' | ')}</output>
    </>
  );
}

const checkbox = (name: RegExp) => screen.getByRole('checkbox', { name });

describe('FacetChecklist', () => {
  it('lists each choice as a checkbox with its count', () => {
    render(<Checklist />);

    expect(screen.getByRole('group', { name: 'Name' })).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: 'GET /orders, 114 traces' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'POST /login, 1 trace' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull();
  });

  it('checks several choices, and unchecks one again', async () => {
    const user = userEvent.setup();
    render(<Checklist />);

    await user.click(checkbox(/^GET \/orders/));
    await user.click(checkbox(/^POST \/login/));

    expect(screen.getByRole('status')).toHaveTextContent(
      'GET /orders | POST /login',
    );

    await user.click(checkbox(/^GET \/orders/));

    expect(screen.getByRole('status')).toHaveTextContent('POST /login');
  });

  it('narrows the list with the search box, whatever the case', async () => {
    const user = userEvent.setup();
    render(<Checklist />);

    await user.type(
      screen.getByRole('searchbox', { name: 'Search names' }),
      'post',
    );

    expect(
      screen.getAllByRole('checkbox').map((box) => box.getAttribute('value')),
    ).toEqual(['POST /checkout', 'POST /login']);
  });

  it('says so when the search matches nothing', async () => {
    const user = userEvent.setup();
    render(<Checklist />);

    await user.type(
      screen.getByRole('searchbox', { name: 'Search names' }),
      'zzz',
    );

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('No names match “zzz”.')).toBeVisible();
  });

  it('keeps a hidden choice checked, and Clear says how many are on', async () => {
    const user = userEvent.setup();
    render(<Checklist initial={['GET /orders', 'POST /login']} />);

    await user.type(
      screen.getByRole('searchbox', { name: 'Search names' }),
      'products',
    );

    expect(checkbox(/^GET \/products/)).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(
      'GET /orders | POST /login',
    );

    await user.click(screen.getByRole('button', { name: 'Clear (2)' }));

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull();
  });

  it('disables a choice with no traces, unless it is checked', () => {
    const { unmount } = render(<Checklist />);
    expect(checkbox(/^POST \/checkout/)).toBeDisabled();
    unmount();

    render(<Checklist initial={['POST /checkout']} />);
    expect(checkbox(/^POST \/checkout/)).toBeEnabled();
    expect(checkbox(/^POST \/checkout/)).toBeChecked();
  });
});
