import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from '@/test/server';
import { setSystemTheme } from '@/test/system-theme';

// A request without a handler is a mistake in the test, so fail loudly.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => setSystemTheme('light'));

afterEach(() => {
  // Vitest globals are off, so Testing Library cannot register its own cleanup.
  cleanup();
  server.resetHandlers();
  // The theme lives outside React: a saved choice and a class on <html>.
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterAll(() => server.close());
