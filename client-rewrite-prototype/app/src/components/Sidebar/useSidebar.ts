import { useCallback, useState } from 'react';

/*
 * Nav state. Two independent, dead-simple booleans — only one is live per layout
 * mode, so there's no "one flag, two defaults" ambiguity:
 *   - railCollapsed: docked mode (>= navOverlay) — full labelled nav vs 80px rail.
 *   - overlayOpen:   overlay mode (<  navOverlay) — hamburger drawer open/closed.
 *
 * STATE MANAGEMENT IS DECISION #4 (still open) — this local hook is the single
 * seam to swap when that's decided. Lifted to App so the Header's hamburger and
 * the Sidebar overlay share `overlayOpen`.
 */
export const useSidebar = () => {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const toggleRail = useCallback(() => setRailCollapsed(c => !c), []);
  const openOverlay = useCallback(() => setOverlayOpen(true), []);
  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  return { railCollapsed, toggleRail, overlayOpen, openOverlay, closeOverlay };
};

export type SidebarState = ReturnType<typeof useSidebar>;
