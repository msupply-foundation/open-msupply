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
  /**
   * Below this, the menu bar becomes a hamburger overlay instead of docked (and
   * the side panel an off-canvas drawer). Also the "narrow viewport" line —
   * tablet portrait and below — at which modal dialogs expand to full screen
   * (ui-standards responsive: tablet portrait / small screen is 600–1023px).
   */
  navOverlay: 1024,
  /** Below this = phone-ish; index.css drops the root font-size here. */
  compact: 600,
  /**
   * At/above this, a page's side panel defaults open (a default-state
   * decision, not a styling nudge). The captured app's widest breakpoint —
   * spec ui-standards/layout.md → page regions.
   */
  sidePanelDefaultOpen: 1536,
  /**
   * At/above this the sidebar rail defaults to EXPANDED; between navOverlay and
   * here it defaults to the mini rail. Like sidePanelDefaultOpen this is a
   * default-state decision, not a styling nudge and not a mode switch — the rail
   * stays docked across the whole range, and the user's own toggle outranks the
   * default and persists. The line sits at 1440 because the fleet's landscape
   * tablets (~1280/1333px) fall below it and desktops above: those tablets get
   * ~180px of width back without losing persistent wayfinding, which hiding the
   * nav behind a hamburger there would have cost.
   */
  railDefaultExpanded: 1440,
  /**
   * Below this HEIGHT the viewport is "short": a landscape tablet, or a
   * windowed laptop. The only breakpoint keyed to height, and the same kind of
   * decision as the rest — which element renders — not a styling nudge.
   *
   * Every other line here asks how much WIDTH there is, which on a landscape
   * screen answers the wrong question: a detail view is wide and short, so a
   * rule written for "narrow" never fires while vertical room is the thing
   * actually running out. Measured on the outbound detail view at 1434×742,
   * 383px of the 742 went to stacked chrome — 52% of the screen — leaving under
   * seven rows.
   *
   * 800 sits above the fleet's landscape tablets (~715px of viewport once
   * browser chrome is off a 768px screen) and this class of laptop window,
   * and below a normal desktop (~950px), which keeps its roomier layout.
   */
  shortViewport: 800,
} as const;

/** matchMedia query strings built from the values above. */
export const mediaQuery = {
  navOverlay: `(max-width: ${breakpoints.navOverlay - 1}px)`,
  compact: `(max-width: ${breakpoints.compact - 1}px)`,
  sidePanelWide: `(min-width: ${breakpoints.sidePanelDefaultOpen}px)`,
  railWide: `(min-width: ${breakpoints.railDefaultExpanded}px)`,
  shortViewport: `(max-height: ${breakpoints.shortViewport - 1}px)`,
} as const;
