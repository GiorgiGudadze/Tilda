import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/routes';

/**
 * Renders the whole app at `path`, with a fresh cache for every test.
 *
 * It uses the browser router, as the app does, because the filters read and
 * write the real address bar. `search()` returns the current query string.
 */
export function renderApp(path: string) {
  window.history.replaceState(null, '', path);
  const router = createBrowserRouter(routes);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return {
    search: () => new URLSearchParams(window.location.search),
  };
}
