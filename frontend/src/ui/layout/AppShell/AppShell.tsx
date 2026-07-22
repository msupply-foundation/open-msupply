import {
  createSignal,
  createEffect,
  Show,
  type JSX,
  type Component,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { HomeIcon, CentralIcon, type IconProps } from '../../icons';
import { useIsNavOverlay } from '../../utils/createMediaQuery';
import { MenuBar, type MenuBarState } from './MenuBar';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';
import { ShellNavContext, ShellFullScreenContext } from './shellContext';
import {
  upperNav,
  lowerNav,
  SYNC_NAV_ID,
  type NavBadge,
  type NavItem,
  type NavLeaf,
} from './navModel';
import { locale, changeLanguage, t } from '../../../intl';
import styles from './AppShell.module.css';

export interface AppShellProps {
  /**
   * The current page — drives the menu-bar highlight. The caller owns
   * selection (a router eventually; page-local state for now), so the shell
   * stays a pure layout element. A page outside the nav (e.g. Home) simply
   * highlights nothing.
   */
  selected: NavLeaf;
  /** The user picked a menu item. */
  onNavigate: (leaf: NavLeaf) => void;
  /**
   * The menu-bar nav model. Defaults to the app's own navModel (upper list +
   * pinned lower cluster). A host with a different menu supplies its own — the
   * showcase passes its section registry (MenuBar's contract). Overriding
   * `upper` replaces the WHOLE model, so `lower` then comes only from the
   * caller (never the app's lower cluster); pass it too if that host wants a
   * pinned block-end group.
   */
  upper?: NavItem[];
  lower?: NavItem[];
  /**
   * The user activated the sidebar's Sync entry — the chrome's sync affordance
   * (spec/chrome § sync indicator: opens the sync modal in place, no
   * navigation). Optional: hosts that don't wire sync (the showcase) get an
   * inert entry.
   */
  onSyncOpen?: () => void;
  /** The Sync entry's status badge (spec/chrome § sync indicator). */
  syncBadge?: NavBadge;
  /** Dim the Sync entry's icon while the latest run is errored. */
  syncIconDimmed?: boolean;
  /**
   * The active store's name, shown in the bottom bar (spec: store selector).
   */
  storeName: string;
  /**
   * Activating the store cell — routes to the store-selection screen (spec
   * SL-6).
   */
  onStoreClick: () => void;
  /**
   * The signed-in user's name, shown in the bottom bar (spec: signed-in user).
   */
  username: string;
  /** Explicit logout, from the user menu (spec: user menu / logout). */
  onLogout: () => void;
  /** On a central server the bottom bar is brand orange; otherwise neutral.
   *  From the isCentralServer global, queried unauthenticated at startup. */
  isCentralServer?: boolean;
  /**
   * The current page — typically a composed <Page> frame (which supplies the
   * pinned-header / scrolling-body / side-panel / content-footer geometry;
   * see ui/layout/Page). The shell provides the space between the
   * menu bar and the orange app footer and never scrolls itself. The page's
   * header must include a <Header>: in overlay mode the hamburger that opens
   * the nav renders inside it (via ShellNavContext), so a page without one
   * has no way into the menu on narrow viewports.
   */
  children: JSX.Element;
}

/*
 * A cell in the orange app footer. Interactive cells (with onClick) render as a
 * <button>; static ones as a <div> — same look, correct semantics.
 */
const FooterCell = (props: {
  icon: Component<IconProps>;
  label: string;
  onClick?: () => void;
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
);

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
  const [railCollapsed, setRailCollapsed] = createSignal(false);
  const [overlayOpen, setOverlayOpen] = createSignal(false);
  const [fullScreen, setFullScreen] = createSignal(false);
  const isOverlay = useIsNavOverlay();

  // Menu nav model — the app's own navModel by default; a host (the showcase)
  // can supply its own. Overriding `upper` replaces the whole model, so
  // `lower` comes only from the caller (a host with its whole menu in one
  // list gets no lower cluster), never the app's default lowerNav.
  const menuUpper = () => props.upper ?? upperNav;
  const menuLower = () => (props.upper ? props.lower : lowerNav);

  const nav: MenuBarState = {
    railCollapsed,
    toggleRail: () => setRailCollapsed(c => !c),
    overlayOpen,
    openOverlay: () => setOverlayOpen(true),
    closeOverlay: () => setOverlayOpen(false),
  };

  // Leaving overlay mode (e.g. widening the window) shouldn't strand an open
  // off-canvas panel — close it so the docked rail shows cleanly.
  createEffect(() => {
    if (!isOverlay()) setOverlayOpen(false);
  });

  // Document direction (RTL for ar/prs/ps) is owned once by App.tsx, driven by
  // the real i18n locale — not here — so there is a single dir effect. The
  // footer LanguageSelector drives that locale via changeLanguage.

  return (
    <ShellNavContext.Provider value={{ isOverlay, openNav: nav.openOverlay }}>
      <ShellFullScreenContext.Provider
        value={{ isFullScreen: fullScreen, setFullScreen }}
      >
        <div class={styles.shell}>
          {/* Full-screen (Open mSupply's host-level mode): the menu bar and the orange
              app footer hide so the page content fills the viewport. The page's own
              header hides too (see Page); its content + footer stay. */}
          <Show when={!fullScreen()}>
            <MenuBar
              nav={nav}
              isOverlay={isOverlay()}
              upper={menuUpper()}
              lower={menuLower()}
              selectedId={props.selected.id}
              // The Sync entry opens the modal in place — never navigates
              // (spec/chrome AC-CH8).
              onSelect={leaf =>
                leaf.id === SYNC_NAV_ID
                  ? props.onSyncOpen?.()
                  : props.onNavigate(leaf)
              }
              syncBadge={props.syncBadge}
              syncIconDimmed={props.syncIconDimmed}
            />
          </Show>
          <div class={styles.main}>
            <div class={styles.content}>{props.children}</div>

            {/* Bottom bar (spec chrome › bottom bar), left to right: the store
                selector (routes to the store-selection screen), a spacer, the
                signed-in user (menu: logout), then the language selector. The
                store name is shown as text, so the store colour is never the
                sole active-store indicator (colour independence / D14). Hidden in
                full-screen mode, like the menu bar. */}
            <Show when={!fullScreen()}>
              <footer
                class={styles.footer}
                data-central={props.isCentralServer ? '' : undefined}
              >
                <FooterCell
                  icon={HomeIcon}
                  label={props.storeName}
                  onClick={props.onStoreClick}
                />
                <span class={styles.footerSpacer} aria-hidden="true" />
                <UserMenu username={props.username} onLogout={props.onLogout} />
                <span class={styles.footerDivider} aria-hidden="true" />
                <LanguageSelector
                  language={locale()}
                  onSelect={v => void changeLanguage(v)}
                />
                {/* Central-server cell: only on a central server (its divider
                    goes with it, so nothing dangles on a remote site). */}
                <Show when={props.isCentralServer}>
                  <span class={styles.footerDivider} aria-hidden="true" />
                  <FooterCell
                    icon={CentralIcon}
                    label={t('label.central-server')}
                  />
                </Show>
              </footer>
            </Show>
          </div>
        </div>
      </ShellFullScreenContext.Provider>
    </ShellNavContext.Provider>
  );
};
