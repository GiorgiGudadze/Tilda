import { lazy, Suspense } from 'react';

// The only lazy page: most visitors never open it, so its code stays out of
// the first download.
const DesignPage = lazy(() =>
  import('@/features/design/DesignPage').then((module) => ({
    default: module.DesignPage,
  })),
);

/** If the download fails, the router's error page offers a reload. */
export function LazyDesignPage() {
  return (
    <Suspense fallback={<p>Loading the design page…</p>}>
      <DesignPage />
    </Suspense>
  );
}
