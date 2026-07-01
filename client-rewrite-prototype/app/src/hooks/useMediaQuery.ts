import { useEffect, useState } from 'react';
import { mediaQuery } from '@/styles/breakpoints';

/*
 * matchMedia wrapper. This is the ONLY responsive mechanism that touches JS —
 * and only for "which element do I render" decisions (per the intrinsic-layout
 * principle). Everything visual stays in CSS.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

/** True when the viewport is narrow enough that the nav should be an overlay. */
export const useIsNavOverlay = () => useMediaQuery(mediaQuery.navOverlay);
