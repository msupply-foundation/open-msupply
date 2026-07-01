import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { isRtlLocale } from './languages';
import { LocaleContext } from './localeContext';

/*
 * App-wide locale + direction. This is the single mechanism that flips the whole
 * UI between LTR and RTL: it sets `dir` and `lang` on <html>, after which the CSS
 * does the rest — logical properties (margin-inline-*, inset-inline-*) and
 * `:dir(rtl)` selectors mean nothing else has to know about direction.
 *
 * NOTE: this only switches DIRECTION + the displayed language name. Translating
 * the UI strings themselves is the i18n decision (deferred) — wiring i18next here
 * later is purely additive. RTL *layout* is what we validate now.
 *
 * A small React context (not a state library) is the right tool: locale is
 * genuinely app-global, and Context is a built-in. State management (decision #4)
 * doesn't change this. The context + hook live in ./localeContext.
 *
 * It also wraps children in Radix's DirectionProvider so every Radix widget
 * (Select, Tabs, DropdownMenu…) gets direction-aware keyboard nav + popup
 * placement in RTL from this one source of truth — Radix reads `dir` from this
 * context, not from <html>, so without it those widgets would stay LTR.
 */
export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState('en');
  const isRtl = isRtlLocale(language);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = isRtl ? 'rtl' : 'ltr';
  }, [language, isRtl]);

  const value = useMemo(
    () => ({ language, isRtl, setLanguage }),
    [language, isRtl]
  );

  return (
    <LocaleContext.Provider value={value}>
      <DirectionProvider dir={isRtl ? 'rtl' : 'ltr'}>
        {children}
      </DirectionProvider>
    </LocaleContext.Provider>
  );
};
