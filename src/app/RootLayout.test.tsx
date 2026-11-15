import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { setSystemTheme } from '@/test/match-media';

const html = document.documentElement;

describe('Theme', () => {
  it('follows the system setting when the user has not chosen', () => {
    setSystemTheme('dark');
    renderApp('/traces');

    expect(html).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeVisible();
  });

  it('switches theme and saves the choice', async () => {
    const user = userEvent.setup();
    renderApp('/traces');
    expect(html).not.toHaveClass('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(html).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    );

    expect(html).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('uses the saved choice over the system setting', () => {
    localStorage.setItem('theme', 'light');
    setSystemTheme('dark');
    renderApp('/traces');

    expect(html).not.toHaveClass('dark');
  });
});

describe('Navigation', () => {
  it('marks the current page, also on a page below it', async () => {
    renderApp('/traces/does-not-exist');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Traces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('link', { name: 'Design' }),
    ).not.toHaveAttribute('aria-current');

    // Let the request finish before the test ends.
    await screen.findByRole('heading', { name: 'Trace not found' });
  });

  it('has a skip link to the main content', () => {
    renderApp('/traces');

    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});
