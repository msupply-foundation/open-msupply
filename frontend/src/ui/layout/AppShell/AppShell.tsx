import {
  createSignal,
  createEffect,
  Show,
  type JSX,
  type Component,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  HomeIcon,
  CentralIcon,
  RefreshIcon,
  type IconProps,
} from '../../icons';
import { useIsNavOverlay, useIsRailWide } from '../../utils/createMediaQuery';
import { createAction } from '../../utils/keyActions';
import { MenuBar, type MenuBarState } from './MenuBar';
import { SyncStatus } from './SyncStatus';
import { UserMenu } from './UserMenu';
import {
  ShellNavContext,
  ShellFullScreenContext,
  ShellOverlayContext,
} from './shellContext';
import { upperNav, lowerNav, type NavItem, type NavLeaf } from './navModel';
import { t } from '../../../intl';
import { footerColourStyle } from './footerColour';
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
   * Activating the brand mark — chrome's conventional route home. Optional for
   * the same reason as the cells above: a host that doesn't wire it gets a
   * plain mark rather than a button that does nothing.
   */
  onHome?: () => void;
  /**
   * The bottom bar's sync cell (spec/chrome § sync status) — the resolved
   * status line, its tone, and whether a run is in flight. Absent → no cell:
   * a host with no session (the showcase) has no sync state to show, and an
   * empty cell would be a dead control.
   */
  syncStatus?: { label: string; tone: 'neutral' | 'warning' | 'error' };
  /** A sync run is in flight — the cell's glyph animates while true. */
  syncing?: boolean;
  /**
   * Start a manual sync from the bottom bar's status line — one click, no
   * dialog. Required alongside `syncStatus`; without both, no cell renders.
   */
  onSyncNow?: () => void;
  /**
   * Open the sync modal, from the status cell's details button (spec/chrome §
   * sync status: it opens in place and MUST NOT navigate).
   */
  onSyncDetails?: () => void;
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
  /**
   * The signed-in user's full display name, heading the user popup
   * (OMS-REG-FTR-01.2).
   */
  displayName: string;
  /** The signed-in user's email address, shown in the user popup
   *  (OMS-REG-FTR-01.4). Absent when the user record records none. */
  email?: string | null;
  /** The signed-in user's job title, the subtitle under the display name in the
   *  user popup. Absent when the user record records none. */
  jobTitle?: string | null;
  /** Explicit logout, from the user menu (spec: user menu / logout). */
  onLogout: () => void;
  /**
   * The server is serving a newer front-end bundle than the running build
   * (spec/chrome § update prompt) — shows the bottom bar's "new version
   * available" cell. Derived by the host's update watch (src/appUpdate.ts).
   */
  updateAvailable?: boolean;
  /**
   * Activating the update cell. The host owns what follows (confirm, then
   * reload) — without it the cell never renders, so it is never a dead button.
   */
  onUpdateClick?: () => void;
  /**
   * The store's custom bottom-bar colour (spec/chrome § bottom bar) — the raw
   * store-custom-colour preference value. A parseable hex colour replaces the
   * bar's background (central or not) with contrast-derived text; anything
   * else, or unset, leaves the default. A DATA colour, not a theme value.
   */
  footerColour?: string;
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
  testId?: string;
}) => (
  <Show
    when={props.onClick}
    fallback={
      <div class={styles.footerCell} data-testid={props.testId}>
        <Dynamic component={props.icon} class={styles.footerIcon} />
        <span class={styles.footerCellText}>{props.label}</span>
      </div>
    }
  >
    <button
      type="button"
      class={styles.footerCell}
      onClick={props.onClick}
      data-testid={props.testId}
    >
      <Dynamic component={props.icon} class={styles.footerIcon} />
      <span class={styles.footerCellText}>{props.label}</span>
    </button>
  </Show>
);

/*
 * The rail's collapsed state, when the user has set it explicitly. One shared
 * key, not per-user, matching side-panel-open: the state is cosmetic. Absent =
 * no choice made, so the width default applies.
 */
const RAIL_COLLAPSED_KEY = 'rail-collapsed';

/*
 * Application shell — the APP-LEVEL container, not the page frame: docked
 * menu bar (the main menu), the orange app footer, and the content slot
 * between them where the current page renders. App chrome lives here
 * because it's identical on every page and its state (rail collapse,
 * overlay open) must survive navigation — so the shell mounts
 * ONCE per app host and pages swap inside it; per-page geometry (pinned
 * header, scrolling body, side panel, content footer) belongs to the <Page>
 * frame the page itself composes (see kdd/page-composition). Until
 * routing is decided the host owning `selected`/`onNavigate` is the router
 * stand-in; a root layout route takes both over later.
 *
 * Two responsive decisions, and only two: WHICH nav renders — docked rail vs.
 * hamburger overlay — from useIsNavOverlay, and what the docked rail DEFAULTS
 * to — expanded vs. mini rail — from useIsRailWide. The second changes no
 * element, only a starting state the user can overrule; everything else is
 * intrinsic layout. The shell
 * renders no header of its own: the page's <Header> hosts the overlay
 * hamburger via ShellNavContext. Adapted from the RnD prototype's App shell.
 */
export const AppShell = (props: AppShellProps) => {
  /*
   * The rail is DOCKED at every width from navOverlay up; what railDefaultExpanded
   * changes is only its DEFAULT state — expanded on a desktop, the mini rail on a
   * 1024–1439 laptop or landscape tablet where width is scarce. Hiding the nav
   * outright in that band was the alternative, and it would have traded permanent
   * wayfinding for the ~80px the mini rail already gives back.
   *
   * An explicit toggle outranks the default and persists across reloads — the
   * same choice-over-responsive-default shape as createSidePanelOpen, and for the
   * same reason: a default the user has overruled should stay overruled, at every
   * width, rather than springing back when they resize.
   */
  let storedRail: boolean | null = null;
  try {
    const raw = localStorage.getItem(RAIL_COLLAPSED_KEY);
    if (raw === 'true' || raw === 'false') storedRail = raw === 'true';
  } catch {
    // Storage unavailable (private mode) — fall through to the width default.
  }
  const railWide = useIsRailWide();
  const [railChoice, setRailChoice] = createSignal<boolean | null>(storedRail);
  const railCollapsed = () => railChoice() ?? !railWide();
  const setRailCollapsed = (next: boolean) => {
    setRailChoice(next);
    try {
      localStorage.setItem(RAIL_COLLAPSED_KEY, String(next));
    } catch {
      // Best effort — the in-session signal still works.
    }
  };

  const [overlayOpen, setOverlayOpen] = createSignal(false);
  const [fullScreen, setFullScreen] = createSignal(false);
  // A page's slide-over panel is covering the viewport (KB-X2). Set by Page
  // through ShellOverlayContext, because the regions that must go inert live
  // here, outside the Page.
  const [panelOverlay, setPanelOverlay] = createSignal(false);
  const isOverlay = useIsNavOverlay();

  // Menu nav model — the app's own navModel by default; a host (the showcase)
  // can supply its own. Overriding `upper` replaces the whole model, so
  // `lower` comes only from the caller (a host with its whole menu in one
  // list gets no lower cluster), never the app's default lowerNav.
  const menuUpper = () => props.upper ?? upperNav;
  const menuLower = () => (props.upper ? props.lower : lowerNav);

  const nav: MenuBarState = {
    railCollapsed,
    toggleRail: () => setRailCollapsed(!railCollapsed()),
    overlayOpen,
    openOverlay: () => setOverlayOpen(true),
    closeOverlay: () => setOverlayOpen(false),
  };

  // "Navigation show/hide" in the command palette (spec/keyboard ui-surface S1 §
  // Commands, `cmdk.drawer-toggle`) — name-only, no shortcut.
  //
  // Registered HERE rather than passed in, because the shell owns the rail's
  // collapsed state. Same structural rule as createSidePanelOpen owning Alt+M
  // (KB-R2): an action is created where the thing it acts on lives, so it cannot
  // be registered for a screen that has no such thing.
  createAction({ name: 'cmdk.drawer-toggle', run: nav.toggleRail });

  // Leaving overlay mode (e.g. widening the window) shouldn't strand an open
  // off-canvas panel — close it so the docked rail shows cleanly.
  createEffect(() => {
    if (!isOverlay()) setOverlayOpen(false);
  });

  // Document direction (RTL for ar/prs/ps) is owned once by App.tsx, driven by
  // the real i18n locale — not here — so there is a single dir effect. The
  // language control that drives that locale lives in Settings › Display; the
  // shell no longer carries one.

  // The store's custom footer colour, when it parses as hex: the footer's two
  // colour knobs set inline (a data colour, as ColourTag's --tag-colour); the
  // module CSS consumes them, so its rules stay the single source of the
  // bar's colouring. Undefined (unset/unparseable) keeps the variant default.
  const customFooterVars = () => {
    const custom = footerColourStyle(props.footerColour);
    return custom
      ? { '--footer-bg': custom.background, '--footer-fg': custom.text }
      : undefined;
  };

  return (
    <ShellNavContext.Provider value={{ isOverlay, openNav: nav.openOverlay }}>
      <ShellOverlayContext.Provider value={{ setPanelOverlay }}>
        <ShellFullScreenContext.Provider
          value={{ isFullScreen: fullScreen, setFullScreen }}
        >
          <div class={styles.shell}>
            {/* Full-screen (Open mSupply's host-level mode): the menu bar and the orange
              app footer hide so the page content fills the viewport. The page's own
              header hides too (see Page); its content + footer stay. */}
            {/* Inert while a page's slide-over covers the viewport (KB-X2/
              AC-KB17) — these regions sit OUTSIDE the Page, so the panel cannot
              reach them itself. */}
            <Show when={!fullScreen()}>
              <MenuBar
                inert={panelOverlay()}
                nav={nav}
                isOverlay={isOverlay()}
                upper={menuUpper()}
                lower={menuLower()}
                selectedId={props.selected.id}
                onHome={props.onHome}
                onSelect={props.onNavigate}
              />
            </Show>
            <div class={styles.main}>
              <div class={styles.content}>{props.children}</div>

              {/* Bottom bar (spec chrome › bottom bar), left to right: the
                store selector (opens the store-switch modal — spec SL-6 / D14)
                and the signed-in user beside it, a spacer, then the inline-end
                cluster — the update prompt, the central-server marker, and the
                sync status last. Identity on one side, site/system state on the
                other; the language selector left the bar entirely and now lives
                in Settings › Display. The store name is shown as text, so the
                store colour is never the sole active-store indicator (colour
                independence). Hidden in full-screen mode, like the menu bar. */}
              <Show when={!fullScreen()}>
                <footer
                  class={styles.footer}
                  inert={panelOverlay()}
                  data-testid="app-footer"
                  data-central={props.isCentralServer ? '' : undefined}
                  // The store's custom colour, when it parses: set as the
                  // footer's two colour knobs (as ColourTag's --tag-colour),
                  // so the stylesheet stays the one place the bar's colouring
                  // — variants included — is decided.
                  style={customFooterVars()}
                >
                  <FooterCell
                    icon={HomeIcon}
                    label={props.storeName}
                    onClick={props.onStoreClick}
                    testId="store-selector-trigger"
                  />
                  <span class={styles.footerDivider} aria-hidden="true" />
                  {/* The signed-in user sits beside the store, not opposite it:
                    the two together answer "who am I, and where am I working" —
                    one question, so one cluster — divided from it by the same
                    hairline the inline-end cells use. */}
                  <UserMenu
                    username={props.username}
                    displayName={props.displayName}
                    email={props.email}
                    jobTitle={props.jobTitle}
                    onLogout={props.onLogout}
                  />
                  <span class={styles.footerSpacer} aria-hidden="true" />
                  {/* Update prompt (spec/chrome § update prompt,
                    OMS-REG-FTR-02.14): a quiet, persistent cell while the
                    served bundle differs from the running build; activating it
                    hands off to the host, which confirms before reloading. Its
                    divider goes with it, so nothing dangles while it's away. */}
                  <Show when={props.updateAvailable && props.onUpdateClick}>
                    <FooterCell
                      icon={RefreshIcon}
                      label={t('label.new-version-available')}
                      onClick={props.onUpdateClick}
                      testId="footer-update-available"
                    />
                    <span class={styles.footerDivider} aria-hidden="true" />
                  </Show>
                  {/* Central-server marker: only on a central server (its
                    divider goes with it, so nothing dangles on a remote site).
                    Immediately before the sync cell — both describe the SITE
                    rather than the session, and which role this server plays is
                    the first thing that qualifies what its sync line means. */}
                  <Show when={props.isCentralServer}>
                    <FooterCell
                      icon={CentralIcon}
                      label={t('label.central-server')}
                      testId="footer-central-server"
                    />
                    <span class={styles.footerDivider} aria-hidden="true" />
                  </Show>
                  {/* Sync status, pinned last (issue #9229): the bar's
                    inline-end is where a standing system signal belongs, and
                    it is the one cell that changes on its own. */}
                  <Show when={props.syncStatus && props.onSyncNow}>
                    {/* Read through the ACCESSOR, not the narrowed value: the
                        <Show> child runs once per truthiness flip, so a label
                        or tone read outside a tracked position would freeze at
                        whatever the cell first rendered
                        (kdd/solid-reactivity-pitfalls §3). */}
                    <SyncStatus
                      label={props.syncStatus?.label ?? ''}
                      tone={props.syncStatus?.tone ?? 'neutral'}
                      syncing={props.syncing}
                      onSync={() => props.onSyncNow?.()}
                      onDetails={() => props.onSyncDetails?.()}
                    />
                  </Show>
                </footer>
              </Show>
            </div>
          </div>
        </ShellFullScreenContext.Provider>
      </ShellOverlayContext.Provider>
    </ShellNavContext.Provider>
  );
};
