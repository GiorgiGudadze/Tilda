import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';

// Stands in for a lazy page whose code fails to download.
vi.mock('@/pages/design/DesignPage', () => {
  throw new Error('Failed to fetch the page code');
});

afterEach(() => vi.restoreAllMocks());

describe('A lazy page that fails to load', () => {
  it('offers a reload and keeps the header', async () => {
    // React reports the caught error on the console. That is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderApp('/design');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'This page could not be shown',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Reload the page' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Traces' })).toBeVisible();
  });
});
