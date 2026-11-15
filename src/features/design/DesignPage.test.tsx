import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('Design page', () => {
  it('loads on demand and shows each component in both themes', async () => {
    renderApp('/design');

    expect(screen.getByText('Loading the design page…')).toBeVisible();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design' }),
    ).toBeVisible();

    for (const name of [
      'Colour tokens',
      'Button',
      'Status badge',
      'Service label',
      'Span bar',
      'Duration bar',
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
