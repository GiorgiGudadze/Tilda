import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

// The inline script in index.html reads the same key before React loads.
const STORAGE_KEY = 'theme';
const SYSTEM_DARK = '(prefers-color-scheme: dark)';

/** The user's saved choice, or `null` when they have not chosen. */
function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null; // Storage can be blocked. The theme then follows the system.
  }
}

function systemTheme(): Theme {
  return window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light';
}

/**
 * The theme follows the system setting until the user picks one. Their pick
 * is saved and wins from then on.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => savedTheme() ?? systemTheme(),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia(SYSTEM_DARK);
    function followSystem() {
      if (savedTheme() === null) {
        setTheme(systemTheme());
      }
    }
    query.addEventListener('change', followSystem);
    return () => query.removeEventListener('change', followSystem);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved, but the theme still changes for this visit.
    }
    setTheme(next);
  }

  return { theme, toggleTheme };
}
