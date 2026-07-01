import { useCallback, useState } from 'react';

/*
 * Sidebar open/closed state. Deliberately a tiny local-state hook: STATE
 * MANAGEMENT IS DECISION #4 (still open), so this is the single seam to swap
 * when that's decided. Nothing else in the Sidebar reads React state directly.
 *
 * The real app's useDrawer also carries hover-open + responsive auto-collapse;
 * those are layered on later (see STATUS.md) once the look is locked in.
 */
export const useSidebar = (initialOpen = true) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const toggle = useCallback(() => setIsOpen(o => !o), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, toggle, open, close };
};
