/**
 * jsdom has no `matchMedia`. This stands in for it and lets a test choose
 * the system theme and the screen width.
 */
const state = { dark: false, wide: true };

function matches(query: string): boolean {
  if (query.includes('prefers-color-scheme: dark')) return state.dark;
  if (query.includes('min-width')) return state.wide;
  return false;
}

export function installMatchMedia() {
  state.dark = false;
  state.wide = true;
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return matches(query);
      },
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}

export function setSystemTheme(theme: 'light' | 'dark') {
  state.dark = theme === 'dark';
}

export function setScreen(size: 'phone' | 'desktop') {
  state.wide = size === 'desktop';
}
