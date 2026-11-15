import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('Design page', () => {
  it('loads on demand and shows each component in both themes', async () => {
    renderApp('/design');

    // The heading is there at once. The rest arrives with the page's code.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Design' }),
    ).toBeVisible();
    expect(screen.getByText('Loading the design page…')).toBeVisible();
    await screen.findByRole('heading', { level: 2, name: 'Colour tokens' });

    for (const name of [
      'Colour tokens',
      'Button',
      'Status badge',
      'Confidence badge',
      'Suggestion card',
      'Service label',
      'Span bar and timeline ruler',
      'Duration bar',
      'Form controls',
      'Duration chart',
      'Pagination',
      'Popover, alert dialog and toast',
      'Empty state',
      'Error state',
      'Skeleton',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeVisible();
    }

    // Once per theme.
    expect(screen.getAllByText('No traces match these filters')).toHaveLength(
      2,
    );
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(2);
  });
});
