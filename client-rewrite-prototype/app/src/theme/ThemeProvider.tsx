import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import type { Theme } from './themeContext';

/*
 * App-wide colour theme. Just as LocaleProvider sets `dir`/`lang` on <html>,
 * this sets `data-theme` — after which the CSS does the rest: the
 * `[data-theme='dark']` override block in styles/tokens.css swaps the design
 * token values, and every component (which only ever reads tokens) recolours
 * automatically. Nothing else has to know dark mode exists.
 *
 * Default is light (see DECISIONS.md) — the OS `prefers-color-scheme` is
 * deliberately NOT consulted. The footer toggle can override to dark, and that
 * choice is persisted so it survives reloads. The pre-paint inline script in
 * index.html applies the same stored value before React mounts, so a dark user
 * never sees a flash of light; this provider is the source of truth thereafter.
 */
const STORAGE_KEY = 'oms-theme';

const readStoredTheme = (): Theme =>
  localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
