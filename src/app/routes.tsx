import { Navigate, type RouteObject } from 'react-router';
import { NotFoundPage } from '@/app/NotFoundPage';
import { RootLayout } from '@/app/RootLayout';
import { RouteError } from '@/app/RouteError';
import { LazyDesignPage } from '@/features/design/LazyDesignPage';
import { InvestigationPage } from '@/features/investigation/InvestigationPage';
import { TraceDetailPage } from '@/features/traces/TraceDetailPage';
import { TracesPage } from '@/features/traces/TracesPage';

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
      { path: 'investigation', element: <InvestigationPage /> },
      { path: 'design', element: <LazyDesignPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
