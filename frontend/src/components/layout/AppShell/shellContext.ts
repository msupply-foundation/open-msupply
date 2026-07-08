import { createContext, useContext, type Accessor } from 'solid-js'

export interface ShellNav {
  /** True when the sidebar is the off-canvas overlay (narrow viewports). */
  isOverlay: Accessor<boolean>
  /** Open the overlay nav panel. */
  openNav: () => void
}

/*
 * Bridge between AppShell and the page's Header: the shell owns the nav
 * overlay state, but the hamburger that opens it belongs visually inside
 * the header strip. AppShell provides this context; Header consumes it and
 * renders the hamburger when the sidebar is overlaid. A Header outside any
 * shell (e.g. in the showcase panel) has no provider and never shows one.
 */
export const ShellNavContext = createContext<ShellNav>()

export const useShellNav = () => useContext(ShellNavContext)
