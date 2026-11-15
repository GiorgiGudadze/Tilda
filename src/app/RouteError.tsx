import { Button } from '@/components/ui/button';

/**
 * Shown by the router when a page throws while rendering, or when the code
 * for a lazy page fails to download. A reload fixes the second case.
 */
export function RouteError() {
  return (
    <>
      <h1 className="text-2xl font-semibold">This page could not be shown</h1>
      <p>Something went wrong while loading it. Reloading usually helps.</p>
      <Button onClick={() => window.location.reload()}>Reload the page</Button>
    </>
  );
}
