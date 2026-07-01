import { createContext, useContext } from 'react';

/*
 * Theme context + hook, kept separate from the provider component so each file
 * has a single export kind (keeps React Fast Refresh happy) — mirrors
 * ../intl/localeContext.
 */

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
