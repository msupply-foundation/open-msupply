import { createContext, useContext } from 'react';

/*
 * Locale context + hook, kept separate from the provider component so each file
 * has a single export kind (keeps React Fast Refresh happy).
 */

export interface LocaleContextValue {
  language: string;
  isRtl: boolean;
  setLanguage: (value: string) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
};
