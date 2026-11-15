/**
 * jsdom has no `matchMedia`. This stands in for it and lets a test say
 * whether the system prefers the dark theme.
 */
export function setSystemTheme(theme: 'light' | 'dark') {
  window.matchMedia = (query: string) =>
    ({
      matches: theme === 'dark' && query.includes('dark'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}
