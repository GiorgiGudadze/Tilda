import { Link, Outlet } from 'react-router';

export function RootLayout() {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <Link to="/traces" className="font-semibold">
            Trace Investigator
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 p-6">
        <Outlet />
      </main>
    </>
  );
}
