/*
 * Breakpoints — the single source of truth. Tweak here.
 *
 * Design principle (see ../../../DECISIONS.md): layout is INTRINSIC by default —
 * elements flow and wrap with flex/grid, min()/clamp(), auto-fit, etc. We do NOT
 * sprinkle breakpoints to nudge spacing or font sizes. Breakpoints exist ONLY to
 * answer "which element do I render?" (e.g. docked sidebar vs. hamburger overlay).
 * So this list stays short on purpose, and it's consumed by the useBreakpoint
 * hook to drive conditional rendering — rarely by CSS media queries.
 */
export const breakpoints = {
  /** Below this, the sidebar becomes a hamburger overlay instead of docked. */
  navOverlay: 1024,
  /** Below this = phone-ish; reserved for future whole-element swaps. */
  compact: 600,
} as const;

/** matchMedia query strings built from the values above. */
export const mediaQuery = {
  navOverlay: `(max-width: ${breakpoints.navOverlay - 1}px)`,
  compact: `(max-width: ${breakpoints.compact - 1}px)`,
} as const;
