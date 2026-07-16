/*
 * Breakpoints — the single source of truth. Ported from the RnD prototype.
 *
 * Design principle (CLAUDE.md #7): layout is INTRINSIC by default — elements
 * flow and wrap with flex/grid, min()/clamp(), auto-fit. We do NOT sprinkle
 * breakpoints to nudge spacing or font sizes. Breakpoints exist ONLY to answer
 * "which element do I render?" (e.g. docked menu bar vs. hamburger overlay),
 * and are consumed by createMediaQuery to drive conditional rendering — rarely
 * by CSS media queries. This list stays short on purpose.
 */
export const breakpoints = {
  /** Below this, the menu bar becomes a hamburger overlay instead of docked. */
  navOverlay: 1024,
  /** Below this = phone-ish; index.css drops the root font-size here. */
  compact: 600,
} as const;

/** matchMedia query strings built from the values above. */
export const mediaQuery = {
  navOverlay: `(max-width: ${breakpoints.navOverlay - 1}px)`,
  compact: `(max-width: ${breakpoints.compact - 1}px)`,
} as const;
