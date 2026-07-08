import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  type JSX,
  type Component,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
  HomeIcon,
  EditIcon,
  UserIcon,
  CentralIcon,
  type IconProps,
} from '../../icons'
import { useIsNavOverlay } from '../../../hooks/createMediaQuery'
import { Sidebar, type SidebarState } from './Sidebar'
import { LanguageSelector } from './LanguageSelector'
import { isRtlLocale } from './languages'
import { ShellNavContext } from './shellContext'
import type { NavLeaf } from './navModel'
import styles from './AppShell.module.css'

export interface AppShellProps {
  /**
   * The current page — drives the sidebar highlight. The caller owns
   * selection (a router eventually; page-local state for now), so the shell
   * stays a pure layout element. A page outside the nav (e.g. Home) simply
   * highlights nothing.
   */
  selected: NavLeaf
  /** The user picked a sidebar item. */
  onNavigate: (leaf: NavLeaf) => void
  /**
   * The page's header — a composed <Header>…</Header>. The shell pins it
   * above the scrolling body; the page owns everything in it (crumb trail,
   * actions, toolbar). Always provide one: in overlay mode the hamburger
   * that opens the nav renders inside it (via ShellNavContext), so a page
   * without a header has no way into the sidebar on narrow viewports.
   */
  header?: JSX.Element
  /** Page body, rendered in the scrolling region between header and footer. */
  children: JSX.Element
}

/*
 * A cell in the orange app footer. Interactive cells (with onClick) render as a
 * <button>; static ones as a <div> — same look, correct semantics.
 */
const FooterCell = (props: {
  icon: Component<IconProps>
  label: string
  onClick?: () => void
}) => (
  <Show
    when={props.onClick}
    fallback={
      <div class={styles.footerCell}>
        <Dynamic component={props.icon} class={styles.footerIcon} />
        <span class={styles.footerCellText}>{props.label}</span>
      </div>
    }
  >
    <button type="button" class={styles.footerCell} onClick={props.onClick}>
      <Dynamic component={props.icon} class={styles.footerIcon} />
      <span class={styles.footerCellText}>{props.label}</span>
    </button>
  </Show>
)

/*
 * Whole-page application shell: docked sidebar + main column (the page's
 * header, scrolling body, footer). The one responsive decision — docked rail
 * vs. hamburger overlay — is driven by useIsNavOverlay; everything else is
 * intrinsic layout. A layout element, not a component: it owns the page frame,
 * the page owns the header content and the body. The shell renders no header
 * of its own — it pins the page-composed <Header> (the `header` prop) above
 * the scroll region, and hands the overlay hamburger into it via
 * ShellNavContext. Adapted from the RnD prototype's App shell.
 */
export const AppShell = (props: AppShellProps) => {
  const [railCollapsed, setRailCollapsed] = createSignal(false)
  const [overlayOpen, setOverlayOpen] = createSignal(false)
  const [language, setLanguage] = createSignal('en')
  const isOverlay = useIsNavOverlay()

  const nav: SidebarState = {
    railCollapsed,
    toggleRail: () => setRailCollapsed((c) => !c),
    overlayOpen,
    openOverlay: () => setOverlayOpen(true),
    closeOverlay: () => setOverlayOpen(false),
  }

  // Leaving overlay mode (e.g. widening the window) shouldn't strand an open
  // off-canvas panel — close it so the docked rail shows cleanly.
  createEffect(() => {
    if (!isOverlay()) setOverlayOpen(false)
  })

  // Picking an RTL language flips the whole document (document-level so
  // portaled popups inherit dir — see DECISIONS.md 2026-07-08). In the real
  // app the shell never unmounts; restoring LTR on unmount is plain effect
  // hygiene for hosts that do unmount it.
  createEffect(() => {
    document.documentElement.dir = isRtlLocale(language()) ? 'rtl' : 'ltr'
  })
  onCleanup(() => {
    document.documentElement.dir = 'ltr'
  })

  return (
    <ShellNavContext.Provider
      value={{ isOverlay, openNav: nav.openOverlay }}
    >
      <div class={styles.shell}>
        <Sidebar
          nav={nav}
          isOverlay={isOverlay()}
          selectedId={props.selected.id}
          onSelect={props.onNavigate}
        />
        <div class={styles.main}>
          {props.header}

          <div class={styles.body}>{props.children}</div>

          <footer class={styles.footer}>
            <FooterCell icon={HomeIcon} label="General" />
            <FooterCell icon={EditIcon} label="Edit" onClick={() => {}} />
            <span class={styles.footerDivider} aria-hidden="true" />
            <FooterCell icon={UserIcon} label="demo" />
            <span class={styles.footerDivider} aria-hidden="true" />
            <LanguageSelector language={language()} onSelect={setLanguage} />
            <FooterCell icon={CentralIcon} label="Central server" />
          </footer>
        </div>
      </div>
    </ShellNavContext.Provider>
  )
}
