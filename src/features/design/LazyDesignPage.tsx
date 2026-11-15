import { lazy, Suspense } from 'react';
import { PageHeading } from '@/app/PageHeading';

// The only lazy page: most visitors never open it, so its code stays out of
// the first download.
const DesignPage = lazy(() =>
  import('@/features/design/DesignPage').then((module) => ({
    default: module.DesignPage,
  })),
);

/**
 * The heading is outside the lazy part, so it is there to receive focus
 * while the code downloads. If the download fails, the router's error page
 * offers a reload.
 */
export function LazyDesignPage() {
  return (
    <>
      <PageHeading title="Design" />
      <Suspense fallback={<p>Loading the design page…</p>}>
        <DesignPage />
      </Suspense>
    </>
  );
}
