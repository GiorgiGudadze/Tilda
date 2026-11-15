import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { setDemoMode } from '@/mocks/demo';
import { installMatchMedia } from '@/test/match-media';
import { server } from '@/test/server';

// A request without a handler is a mistake in the test, so fail loudly.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

// Every test starts on a desktop screen with a light system theme.
beforeEach(() => installMatchMedia());

afterEach(() => {
  // Vitest globals are off, so Testing Library cannot register its own cleanup.
  cleanup();
  server.resetHandlers();
  setDemoMode('normal');
  // The theme lives outside React: a saved choice and a class on <html>.
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

afterAll(() => server.close());
