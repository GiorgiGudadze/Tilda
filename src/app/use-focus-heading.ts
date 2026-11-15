import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Moves focus to the page's heading when the user goes to another page.
 *
 * In a single-page app nothing reloads, so a screen reader says nothing
 * when a link is followed, and keyboard focus stays on a link that may no
 * longer exist. Focusing the heading announces the new page and puts the
 * keyboard at its start.
 *
 * Only the path counts. A change of filters is the same page.
 */
export function useFocusHeadingOnNavigation() {
  const { pathname } = useLocation();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    // Not on the first page, and not after the redirect from "/": the user
    // did not go anywhere yet.
    if (from === null || from === '/' || from === pathname) {
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [pathname]);
}
