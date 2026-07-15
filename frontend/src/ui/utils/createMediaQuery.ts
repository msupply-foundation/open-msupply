import { createSignal, onCleanup } from 'solid-js';
import { mediaQuery } from '../styles/breakpoints';

/*
 * matchMedia as a Solid signal. This is the ONLY responsive mechanism that
 * touches JS — and only for "which element do I render" decisions (CLAUDE.md
 * #7). Everything visual stays in CSS. Solid's fine-grained reactivity means we
 * subscribe once and read the accessor wherever a render branch depends on it;
 * no effect/cleanup ceremony at the call site (this owns the listener).
 */
export const createMediaQuery = (query: string): (() => boolean) => {
  const mql = window.matchMedia(query);
  const [matches, setMatches] = createSignal(mql.matches);
  const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
  mql.addEventListener('change', onChange);
  onCleanup(() => mql.removeEventListener('change', onChange));
  return matches;
};

/** True when the viewport is narrow enough that the nav should be an overlay. */
export const useIsNavOverlay = () => createMediaQuery(mediaQuery.navOverlay);
