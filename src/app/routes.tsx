import { Navigate, type RouteObject } from 'react-router';
import { NotFoundPage } from '@/app/NotFoundPage';
import { RootLayout } from '@/app/RootLayout';
import { RouteError } from '@/app/RouteError';
import { LazyDesignPage } from '@/pages/design/LazyDesignPage';
import { ServicesPage } from '@/pages/services/ServicesPage';
import { TraceDetailPage } from '@/pages/trace/TraceDetailPage';
import { TracesPage } from '@/pages/traces/TracesPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    // Keeps the header, so the user can still move to another page.
    errorElement: (
      <RootLayout>
        <RouteError />
      </RootLayout>
    ),
    children: [
      { index: true, element: <Navigate to="/traces" replace /> },
      { path: 'traces', element: <TracesPage /> },
      { path: 'traces/:id', element: <TraceDetailPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'design', element: <LazyDesignPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
