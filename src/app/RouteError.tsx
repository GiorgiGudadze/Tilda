import { PageHeading } from '@/app/PageHeading';
import { Button } from '@/components/ui/button';

/**
 * Shown by the router when a page throws while rendering, or when the code
 * for a lazy page fails to download. A reload fixes the second case.
 */
export function RouteError() {
  return (
    <>
      <PageHeading title="This page could not be shown" />
      <p>Something went wrong while loading it. Reloading usually helps.</p>
      <Button onClick={() => window.location.reload()}>Reload the page</Button>
    </>
  );
}
