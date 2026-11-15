import { Button } from '@/components/ui/button';

/** Shown by the router when a page throws while rendering. */
export function RouteError() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p>The page hit an unexpected error.</p>
      <Button onClick={() => window.location.reload()}>Reload the page</Button>
    </main>
  );
}
