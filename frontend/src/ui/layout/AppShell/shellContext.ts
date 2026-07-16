import { createContext, useContext, type Accessor } from 'solid-js';

export interface ShellNav {
  /** True when the menu bar is the off-canvas overlay (narrow viewports). */
  isOverlay: Accessor<boolean>;
  /** Open the overlay nav panel. */
  openNav: () => void;
}

/*
 * Full-screen mode, owned by the shell (like Open mSupply's host-level
 * fullScreen): a table's toggle button flips it, and the shell + page chrome
 * react — the menu bar, the orange app footer, and the page header all hide,
 * so the content region (the table and its pagination/selection footer) fills
 * the viewport. A shared flag rather than table-internal state, so every
 * chrome region can respond.
 */
export interface ShellFullScreen {
  isFullScreen: Accessor<boolean>;
  setFullScreen: (value: boolean) => void;
}

export const ShellFullScreenContext = createContext<ShellFullScreen>();

export const useFullScreen = () => useContext(ShellFullScreenContext);

/*
 * Bridge between AppShell and the page's Header: the shell owns the nav
 * overlay state, but the hamburger that opens it belongs visually inside
 * the header strip. AppShell provides this context; Header consumes it and
 * renders the hamburger when the menu bar is overlaid. A Header outside any
 * shell (e.g. in the showcase panel) has no provider and never shows one.
 */
export const ShellNavContext = createContext<ShellNav>();

export const useShellNav = () => useContext(ShellNavContext);
