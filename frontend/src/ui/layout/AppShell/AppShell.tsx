import {
  createSignal,
  createEffect,
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
import { useIsNavOverlay } from '../../utils/createMediaQuery'
import { MenuBar, type MenuBarState } from './MenuBar'
import { LanguageSelector } from './LanguageSelector'
import { ShellNavContext } from './shellContext'
import { upperNav, lowerNav, type NavLeaf } from './navModel'
import { locale, changeLanguage, t } from '../../../intl'
import styles from './AppShell.module.css'

export interface AppShellProps {
  /**
   * The current page — drives the menu-bar highlight. The caller owns
   * selection (a router eventually; page-local state for now), so the shell
   * stays a pure layout element. A page outside the nav (e.g. Home) simply
   * highlights nothing.
   */
  selected: NavLeaf
  /** The user picked a menu item. */
  onNavigate: (leaf: NavLeaf) => void
  /**
   * The current page — typically a composed <Page> frame (which supplies the
   * pinned-header / scrolling-body / side-panel / content-footer geometry;
   * see ui/layout/Page). The shell provides the space between the
   * menu bar and the orange app footer and never scrolls itself. The page's
   * header must include a <Header>: in overlay mode the hamburger that opens
   * the nav renders inside it (via ShellNavContext), so a page without one
   * has no way into the menu on narrow viewports.
   */
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
 * Application shell — the APP-LEVEL container, not the page frame: docked
 * menu bar (the main menu), the orange app footer, and the content slot
 * between them where the current page renders. App chrome lives here
 * because it's identical on every page and its state (rail collapse,
 * overlay open, language) must survive navigation — so the shell mounts
 * ONCE per app host and pages swap inside it; per-page geometry (pinned
 * header, scrolling body, side panel, content footer) belongs to the <Page>
 * frame the page itself composes (see kdd/page-composition). Until
 * routing is decided the host owning `selected`/`onNavigate` is the router
 * stand-in; a root layout route takes both over later.
 *
 * The one responsive decision — docked rail vs. hamburger overlay — is
 * driven by useIsNavOverlay; everything else is intrinsic layout. The shell
 * renders no header of its own: the page's <Header> hosts the overlay
 * hamburger via ShellNavContext. Adapted from the RnD prototype's App shell.
 */
export const AppShell = (props: AppShellProps) => {
  const [railCollapsed, setRailCollapsed] = createSignal(false)
  const [overlayOpen, setOverlayOpen] = createSignal(false)
  const isOverlay = useIsNavOverlay()

  const nav: MenuBarState = {
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

  // Document direction (RTL for ar/prs/ps) is owned once by App.tsx, driven by
  // the real i18n locale — not here — so there is a single dir effect. The
  // footer LanguageSelector drives that locale via changeLanguage.

  return (
    <ShellNavContext.Provider
      value={{ isOverlay, openNav: nav.openOverlay }}
    >
      <div class={styles.shell}>
        <MenuBar
          nav={nav}
          isOverlay={isOverlay()}
          upper={upperNav}
          lower={lowerNav}
          selectedId={props.selected.id}
          onSelect={props.onNavigate}
        />
        <div class={styles.main}>
          <div class={styles.content}>{props.children}</div>

          <footer class={styles.footer}>
            <FooterCell icon={HomeIcon} label={t('shell.footer.general')} />
            <FooterCell icon={EditIcon} label={t('shell.footer.edit')} onClick={() => {}} />
            <span class={styles.footerDivider} aria-hidden="true" />
            {/* Placeholder username — real user data lands with the user menu. */}
            <FooterCell icon={UserIcon} label="demo" />
            <span class={styles.footerDivider} aria-hidden="true" />
            <LanguageSelector language={locale()} onSelect={(v) => void changeLanguage(v)} />
            <FooterCell icon={CentralIcon} label={t('shell.footer.central-server')} />
          </footer>
        </div>
      </div>
    </ShellNavContext.Provider>
  )
}
