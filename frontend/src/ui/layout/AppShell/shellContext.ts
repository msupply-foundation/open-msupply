import {
  createContext,
  useContext,
  type Accessor,
  type Component,
} from 'solid-js';
import type { IconProps } from '../../icons';

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

/*
 * Second bridge of the same kind, for the other end of the header strip: the
 * nav group a screen sits under is never a crumb, its glyph takes the
 * breadcrumb's leading-icon slot instead (spec/ui-standards › layout, page
 * regions) — and that group is a fact about the ROUTE, which only the routed
 * shell knows. So the shell derives it (ShellLayout, from navModel's section
 * icons) and every page's Breadcrumb picks it up, rather than each of the ~35
 * pages hard-coding its own section's glyph and drifting from the menu.
 *
 * A page that needs a different glyph still wins: an explicit `icon` prop
 * overrides this (the inbound-shipment detail screen's record-kind truck). A
 * Breadcrumb outside any shell (the showcase) has no provider and shows the
 * icon it was given, or none.
 */
export interface ShellSection {
  /** The current route's section glyph, undefined outside the nav tree. */
  icon: Accessor<Component<IconProps> | undefined>;
}

export const ShellSectionContext = createContext<ShellSection>();

export const useShellSection = () => useContext(ShellSectionContext);

/*
 * A page's slide-over panel has taken over the viewport, so every shell region
 * OUTSIDE it must go inert (spec/keyboard KB-X2: the panel "traps focus while
 * open, so no rung below it can see the key").
 *
 * This has to live at the shell, not in `Page`: `Page` marks its own main column
 * inert, but `MenuBar` and the app footer render outside `Page`, so `Tab` from an
 * open overlay panel still reached the nav destinations, the theme toggle, the
 * language selector and sync. The boundary belongs where those regions are.
 *
 * `inert` IS the trap. A native modal `<dialog>`'s focus trap is also
 * document-wide inertness plus containment, and neither stops `Tab` reaching
 * browser chrome — that gap is accepted, recorded once (kdd/keyboard-layer).
 *
 * Same shape as ShellFullScreen: a page-level flag the shell chrome reacts to.
 * A `Page` outside any shell (the showcase) has no provider and keeps its own
 * column-level inert, which is all it can reach.
 */
export interface ShellOverlay {
  setPanelOverlay: (active: boolean) => void;
}

export const ShellOverlayContext = createContext<ShellOverlay>();

export const useShellOverlay = () => useContext(ShellOverlayContext);
