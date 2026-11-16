import { NuqsAdapter } from 'nuqs/adapters/react-router/v8';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { SimulateControl } from '@/app/SimulateControl';
import { useFocusHeadingOnNavigation } from '@/app/use-focus-heading';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/lib/use-theme';

const NAV_LINKS = [
  { to: '/traces', label: 'Traces' },
  { to: '/services', label: 'Services' },
  { to: '/design', label: 'Design' },
];

/**
 * The frame around every page: skip link, header and the main landmark.
 * It shows the current route, or `children` when given (the error page).
 */
export function RootLayout({ children }: { children?: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  useFocusHeadingOnNavigation();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to main content
      </a>
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <Link to="/traces" className="font-semibold">
            Trace Investigator
          </Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="rounded-sm py-1 text-muted-foreground underline-offset-8 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SimulateControl />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-7xl space-y-4 px-4 py-6 outline-none sm:px-6"
      >
        {/* Lets the pages keep their filters in the URL (nuqs). */}
        <NuqsAdapter>{children ?? <Outlet />}</NuqsAdapter>
      </main>
      <Toaster theme={theme} />
    </>
  );
}
