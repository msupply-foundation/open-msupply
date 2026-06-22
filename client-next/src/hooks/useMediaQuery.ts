import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query. Replaces MUI's `useMediaQuery`.
 *
 * For the legacy `theme.breakpoints.down('sm')` (phone) pattern, pass the
 * matching max-width query. The breakpoints match the Tailwind config in
 * index.css (sm 600 / md 900), so JS swaps and `sm:`/`md:` utilities switch
 * at the same widths. Helper hooks below cover the common cases.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    callback => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false, // SSR/initial: assume desktop
  );
}

/** < sm (600px) — the legacy `down('sm')` "phone" breakpoint. */
export const useIsPhone = (): boolean => useMediaQuery('(max-width: 599px)');

/** < md (900px) — the legacy `down('md')` "small screen" breakpoint. */
export const useIsSmallScreen = (): boolean =>
  useMediaQuery('(max-width: 899px)');
