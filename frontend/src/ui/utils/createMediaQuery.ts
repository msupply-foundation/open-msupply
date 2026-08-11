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

/**
 * True when the viewport is narrow enough (tablet portrait and below) that the
 * nav should be an overlay. The same "narrow viewport" line also drives modal
 * dialogs to full screen — see Dialog.tsx.
 */
export const useIsNavOverlay = () => createMediaQuery(mediaQuery.navOverlay);

/**
 * True on phone-ish widths (below the compact breakpoint) — where the DataTable
 * switches to its card layout and index.css drops the root font-size. Keeps the
 * 600px cutoff living once in breakpoints.ts (a CSS media query can't read a
 * custom property, so the value stays in JS, per CLAUDE.md #7).
 */
export const useIsCompact = () => createMediaQuery(mediaQuery.compact);

/*
 * True when the user has asked the OS to reduce motion (WCAG 2.2 SC 2.3.3).
 *
 * Reduced motion is a TOKEN-LAYER concern first — every duration in the app
 * comes from a --motion-* token that tokens.css zeroes under this same query,
 * so CSS needs no help here (see src/ui/docs/STYLING.md). This is only for the
 * handful of places where the motion is decided in JS and there is no
 * declaration to zero: skipping work rather than shortening it.
 *
 * Deliberately NOT a signal. Both callers ask inside an event handler (a
 * pointerdown, a click) where a one-shot read is the whole question and a
 * subscription would just leak a listener; createMediaQuery above is the
 * reactive form if a render branch ever needs one.
 */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * `scrollIntoView` options with the smooth behaviour dropped under reduced
 * motion — a long smooth scroll is exactly the vestibular trigger SC 2.3.3 is
 * about. Only for scrolls that WANT to be smooth; a `block: 'nearest'` nudge
 * (the default `auto` behaviour) is already instant and needs nothing.
 */
export const smoothScrollOptions = (
  options: Omit<ScrollIntoViewOptions, 'behavior'> = {}
): ScrollIntoViewOptions => ({
  ...options,
  behavior: prefersReducedMotion() ? 'auto' : 'smooth',
});
