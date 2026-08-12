import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createSignal,
  onCleanup,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { ChevronDownIcon, SidebarIcon, AlertTriangleIcon } from '../../icons';
import { AppLogo } from '../../branding/AppLogo';
import { Badge } from '../../elements/feedback/Badge';
import { t } from '../../../intl';
import { NavFlyout, type FlyoutTarget } from './NavFlyout';
import {
  SYNC_NAV_ID,
  type NavBadge,
  type NavItem,
  type NavLeaf,
} from './navModel';
import styles from './MenuBar.module.css';

export interface MenuBarState {
  railCollapsed: () => boolean;
  toggleRail: () => void;
  overlayOpen: () => boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
}

interface MenuBarProps {
  nav: MenuBarState;
  /** True below the navOverlay breakpoint — render the hamburger overlay. */
  isOverlay: boolean;
  /**
   * The nav model, host-supplied: the scrolling upper list, and optionally
   * the cluster pinned at the block-end (AppShell passes the app's navModel;
   * the showcase passes its section registry).
   */
  upper: NavItem[];
  lower?: NavItem[];
  selectedId: string;
  onSelect: (leaf: NavLeaf) => void;
  /**
   * Activating the brand mark — the conventional "home" of an app's chrome
   * (Jira, Confluence, Zendesk all send you home from the logo). Wiring it is
   * what makes the mark a button: a host that doesn't (the showcase) gets a
   * plain mark, never a button that does nothing — the FooterCell rule.
   * Deliberately NOT the rail toggle: a mark that collapses the navigation
   * contradicts what people click it expecting, and the rail has its own
   * explicit toggle (spec/chrome § sidebar).
   */
  onHome?: () => void;
  /** Status badge for the Sync entry (spec/chrome § sync indicator). */
  syncBadge?: NavBadge;
  /** Dim the Sync entry's icon while the latest run is errored. */
  syncIconDimmed?: boolean;
  /**
   * Unreachable by keyboard and assistive tech while a page's slide-over panel
   * has taken over the viewport (spec/keyboard KB-X2/AC-KB17). The shell sets
   * it; the menu bar renders outside the `Page` that owns the panel, so the
   * panel cannot mark it inert itself.
   */
  inert?: boolean;
}

/*
 * How a rail button reaches the shared flyout while the rail is collapsed.
 * Passed explicitly down the two levels of nav list rather than delegated from
 * a container listener, so every open and close is a call you can click
 * through (kdd/explicit-composition).
 */
interface RailFlyout {
  /** Labels are hidden — the flyout is the only way to a child destination. */
  collapsed: () => boolean;
  /** Pointer hover: opens after a short intent delay. */
  hover: (item: NavItem, anchor: HTMLElement) => void;
  /** Focus or tap: opens at once. */
  open: (item: NavItem, anchor: HTMLElement) => void;
  /** →/Enter on a section icon: open and move focus into the panel. */
  enter: (item: NavItem, anchor: HTMLElement) => void;
  /** Pointer left, or focus moved out: closes after a grace delay. */
  scheduleClose: () => void;
  close: (restoreFocus: boolean) => void;
  /** Is this item's flyout the open one (drives the trigger's aria-expanded). */
  isOpen: (item: NavItem) => boolean;
}

/* Hover intent before a flyout opens, and the grace period before it closes —
   long enough for the pointer to cross the gap to the panel. */
const HOVER_DELAY = 110;
const CLOSE_DELAY = 180;

/* → opens a section's flyout, ← walks back out; mirrored in RTL, where the
   rail sits on the inline-end and the panel opens to the physical left. */
const forwardKey = (el: HTMLElement) =>
  getComputedStyle(el).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';

/*
 * No end chevron on the selected row. The current app marks selection with a
 * brand-orange chevron at the inline-end edge; with the brand tint and the bold
 * weight both carrying it now (and the weight satisfying colour independence on
 * its own), that chevron was a third cue costing every row ~1.5rem of label —
 * which is what truncated "Outbound Shipments", the nav's longest label, at the
 * exact moment selecting it made the text wider.
 * Item layout is now [icon][chevron|slot][label].
 */

/*
 * Collapsed, a rail button's label is display:none — out of the accessible
 * tree with it — so the name moves to aria-label, and the native `title`
 * tooltip goes away rather than doubling up with the flyout's own. Expanded,
 * `title` stays as the reveal for a truncated label.
 */
const nameProps = (label: string, collapsed: boolean) => ({
  title: collapsed ? undefined : label,
  'aria-label': collapsed ? label : undefined,
});

/**
 * Top-level leaf link: icon + empty chevron slot (so labels align with
 * sections). Collapsed, hover or focus raises the label as a flyout tooltip.
 */
const TopLeaf = (props: {
  item: NavItem;
  selected: boolean;
  onSelect: () => void;
  rail: RailFlyout;
  badge?: NavBadge;
  iconDimmed?: boolean;
}) => (
  <li class={styles.item}>
    <button
      type="button"
      class={styles.navButton}
      data-selected={props.selected ? 'true' : undefined}
      data-testid={`nav-${props.item.id}`}
      {...nameProps(t(props.item.labelKey), props.rail.collapsed())}
      onClick={props.onSelect}
      onMouseEnter={e => props.rail.hover(props.item, e.currentTarget)}
      onMouseLeave={props.rail.scheduleClose}
      onFocus={e => props.rail.open(props.item, e.currentTarget)}
      onBlur={props.rail.scheduleClose}
      onKeyDown={e => {
        if (e.key === 'Escape') props.rail.close(false);
      }}
    >
      <span
        class={styles.icon}
        data-dimmed={props.iconDimmed ? 'true' : undefined}
      >
        <Dynamic component={props.item.icon} />
      </span>
      <span class={styles.chevronSlot} aria-hidden="true" />
      <span class={styles.label}>{t(props.item.labelKey)}</span>
      {/* Non-keyed <Show>/<Match> children run once per truthiness flip; the
          badge's fields must be read via the accessor in attribute positions
          so a changing count re-renders (kdd/solid-reactivity-pitfalls §3). */}
      <Switch>
        <Match when={props.badge?.kind === 'alert' && props.badge}>
          {alert => (
            // The current app's alert marker is a bare error-coloured glyph,
            // not a pill; the title carries the meaning for hover/AT.
            <span
              class={`${styles.badge} ${styles.alertBadge}`}
              role="img"
              aria-label={alert().title}
              title={alert().title}
            >
              <AlertTriangleIcon />
            </span>
          )}
        </Match>
        <Match when={props.badge?.kind === 'count' && props.badge}>
          {count => (
            <Badge
              class={styles.badge}
              label={count().label}
              tone={count().tone}
              title={count().title}
            />
          )}
        </Match>
      </Switch>
    </button>
  </li>
);

/**
 * Expandable parent: icon + collapse chevron (between icon and label) + label.
 *
 * Expanded, it opens in place and the open section is the ONLY open one (the
 * accordion state is owned by MenuBar). Collapsed, the in-place list has
 * nowhere to go, so the same button becomes the flyout's trigger — hover,
 * focus, tap, or → / Enter — and carries the "you are here" marker when the
 * active destination is one of its hidden children.
 */
const NavSection = (props: {
  item: NavItem;
  selectedId: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (leaf: NavLeaf) => void;
  rail: RailFlyout;
}) => {
  const containsSelected = () =>
    props.item.children?.some(c => c.id === props.selectedId) ?? false;

  return (
    <li class={styles.item}>
      <button
        type="button"
        class={styles.navButton}
        data-active={containsSelected() ? 'true' : undefined}
        data-testid={`nav-${props.item.id}`}
        /* Collapsed the button no longer expands a list in place — it opens a
           menu — so its ARIA says so. */
        aria-haspopup={props.rail.collapsed() ? 'menu' : undefined}
        aria-expanded={
          props.rail.collapsed() ? props.rail.isOpen(props.item) : props.open
        }
        {...nameProps(t(props.item.labelKey), props.rail.collapsed())}
        onClick={e => {
          if (props.rail.collapsed())
            props.rail.open(props.item, e.currentTarget);
          else props.onToggle();
        }}
        onMouseEnter={e => props.rail.hover(props.item, e.currentTarget)}
        onMouseLeave={props.rail.scheduleClose}
        onFocus={e => props.rail.open(props.item, e.currentTarget)}
        onBlur={props.rail.scheduleClose}
        onKeyDown={e => {
          if (!props.rail.collapsed()) return;
          const button = e.currentTarget;
          if (
            e.key === forwardKey(button) ||
            e.key === 'Enter' ||
            e.key === ' '
          ) {
            // Prevent the default activation too: collapsed, Enter/Space step
            // into the flyout instead of toggling a list nobody can see.
            e.preventDefault();
            props.rail.enter(props.item, button);
          } else if (e.key === 'Escape') props.rail.close(false);
        }}
      >
        {/* The "where am I" marker: collapsed, a section whose child is the
            active destination carries an accent bar at the rail's edge (CSS),
            because its highlighted child is hidden inside the flyout. */}
        <span class={styles.icon}>
          <Dynamic component={props.item.icon} />
        </span>
        <ChevronDownIcon
          class={styles.sectionChevron}
          data-open={props.open ? 'true' : 'false'}
          aria-hidden="true"
        />
        <span class={styles.label}>{t(props.item.labelKey)}</span>
      </button>
      <Show when={props.open}>
        <ul class={styles.childList}>
          <For each={props.item.children}>
            {leaf => (
              <li class={styles.item}>
                <button
                  type="button"
                  class={styles.navButton}
                  data-selected={
                    leaf.id === props.selectedId ? 'true' : undefined
                  }
                  title={t(leaf.labelKey)}
                  onClick={() => props.onSelect(leaf)}
                >
                  <span class={styles.label}>{t(leaf.labelKey)}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
};

const NavGroup = (props: {
  items: NavItem[];
  selectedId: string;
  openSection: string | undefined;
  onToggleSection: (id: string) => void;
  onSelect: (leaf: NavLeaf) => void;
  rail: RailFlyout;
  class?: string;
  syncBadge?: NavBadge;
  syncIconDimmed?: boolean;
}) => (
  <ul class={`${styles.navList} ${props.class ?? ''}`}>
    <For each={props.items}>
      {item => (
        <Show
          when={item.children}
          fallback={
            <TopLeaf
              item={item}
              selected={item.id === props.selectedId}
              rail={props.rail}
              badge={item.id === SYNC_NAV_ID ? props.syncBadge : undefined}
              iconDimmed={
                item.id === SYNC_NAV_ID ? props.syncIconDimmed : undefined
              }
              onSelect={() =>
                props.onSelect({
                  id: item.id,
                  labelKey: item.labelKey,
                  to: item.to,
                })
              }
            />
          }
        >
          <NavSection
            item={item}
            selectedId={props.selectedId}
            open={props.openSection === item.id}
            onToggle={() => props.onToggleSection(item.id)}
            onSelect={props.onSelect}
            rail={props.rail}
          />
        </Show>
      )}
    </For>
  </ul>
);

const NavLists = (props: {
  upper: NavItem[];
  lower?: NavItem[];
  selectedId: string;
  openSection: string | undefined;
  onToggleSection: (id: string) => void;
  onSelect: (leaf: NavLeaf) => void;
  rail: RailFlyout;
  syncBadge?: NavBadge;
  syncIconDimmed?: boolean;
}) => (
  // One scroll region spanning BOTH groups (not per-section) so the two lists
  // never scroll independently and overlap (#421). The lower group is pushed to
  // the block-end (margin-block-start:auto in .lower) so on a tall screen it
  // rests at the bottom as before; only when the combined lists overflow does
  // everything scroll together.
  <div class={styles.scroll}>
    <NavGroup
      items={props.upper}
      selectedId={props.selectedId}
      openSection={props.openSection}
      onToggleSection={props.onToggleSection}
      onSelect={props.onSelect}
      rail={props.rail}
      class={styles.upper}
    />
    <Show when={props.lower?.length}>
      <NavGroup
        items={props.lower!}
        selectedId={props.selectedId}
        openSection={props.openSection}
        onToggleSection={props.onToggleSection}
        onSelect={props.onSelect}
        rail={props.rail}
        class={styles.lower}
        syncBadge={props.syncBadge}
        syncIconDimmed={props.syncIconDimmed}
      />
    </Show>
  </div>
);

/*
 * One menu bar, two layout modes — never a duplicate mobile nav component.
 *   - docked  (>= navOverlay): part of the flex row; an explicit toggle beside
 *     the brand mark collapses it to the icon rail, where sections open their
 *     children as flyouts (spec/chrome § sidebar).
 * - overlay (<  navOverlay): off-canvas panel + scrim, opened by the header's
 *     hamburger; the SAME NavLists, closing on navigate or scrim tap. Which
 *     mode renders is a "which element" decision — the one place a breakpoint
 *     is allowed (via useIsNavOverlay in AppShell). There is no icon rail off
 *     desktop: the overlay always shows full labels, so it needs no flyout.
 */
export const MenuBar = (props: MenuBarProps) => {
  const select = (leaf: NavLeaf) => {
    props.onSelect(leaf);
    if (props.isOverlay) props.nav.closeOverlay();
  };

  // --- Accordion (expanded rail) ------------------------------------------
  // ONE section open at a time, owned here rather than per-section, because
  // "open this one" means "close that one" — a decision no single section can
  // make. Spanning both groups: the lower cluster's sections take part too.
  const sectionOf = (leafId: string) =>
    [...props.upper, ...(props.lower ?? [])].find(item =>
      item.children?.some(child => child.id === leafId)
    )?.id;
  const [openSection, setOpenSection] = createSignal(
    sectionOf(props.selectedId)
  );
  // The active destination's section opens itself — after a navigation from
  // elsewhere (a link, the command palette, a flyout) the rail shows where you
  // landed. Navigating to a top-level leaf leaves the open section alone
  // rather than closing it out from under the pointer.
  createEffect(() => {
    const active = sectionOf(props.selectedId);
    if (active) setOpenSection(active);
  });
  const toggleSection = (id: string) =>
    setOpenSection(open => (open === id ? undefined : id));

  // --- Flyout (collapsed rail) --------------------------------------------
  const [flyout, setFlyout] = createSignal<FlyoutTarget | undefined>();
  let panel: HTMLDivElement | undefined;
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  // The rail button a dismissal is handing focus back to. Focus normally OPENS
  // a flyout, so without this the Escape that closed one would reopen it the
  // instant focus lands back on the icon — the panel would be undismissable by
  // keyboard. Held only for the duration of that synchronous .focus() call.
  let dismissedAnchor: HTMLElement | undefined;
  const clearTimers = () => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    openTimer = undefined;
    closeTimer = undefined;
  };
  onCleanup(clearTimers);

  const rail: RailFlyout = {
    // Only the docked rail collapses; the overlay always shows labels.
    collapsed: () => !props.isOverlay && props.nav.railCollapsed(),
    open: (item, anchor) => {
      if (!rail.collapsed() || anchor === dismissedAnchor) return;
      clearTimers();
      setFlyout({ item, anchor });
    },
    hover: (item, anchor) => {
      if (!rail.collapsed()) return;
      clearTimers();
      openTimer = setTimeout(() => setFlyout({ item, anchor }), HOVER_DELAY);
    },
    enter: (item, anchor) => {
      if (!rail.collapsed()) return;
      clearTimers();
      // focusFirst is read by the panel's own open effect, so focus lands
      // after it is shown and has a focusable row (a popover is display:none
      // until then).
      setFlyout({ item, anchor, focusFirst: true });
    },
    scheduleClose: () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        // Focus inside the panel keeps it open: a keyboard user has stepped in,
        // and the anchor's blur is what brought us here.
        if (panel?.contains(document.activeElement)) return;
        setFlyout(undefined);
      }, CLOSE_DELAY);
    },
    close: restoreFocus => {
      clearTimers();
      const open = flyout();
      setFlyout(undefined);
      // Dismissal returns focus to the trigger (spec D6) — the rail button,
      // not the row that was focused inside the panel.
      if (restoreFocus && open) {
        dismissedAnchor = open.anchor;
        open.anchor.focus();
        dismissedAnchor = undefined;
      }
    },
    isOpen: item => flyout()?.item.id === item.id,
  };

  // Collapsing or expanding the rail invalidates whatever is open against it.
  createEffect(() => {
    if (!rail.collapsed()) rail.close(false);
  });

  return (
    <Show
      when={props.isOverlay}
      fallback={
        <nav
          class={styles.menuBar}
          inert={props.inert}
          data-open={!props.nav.railCollapsed() ? 'true' : 'false'}
          data-testid="drawer"
          aria-expanded={!props.nav.railCollapsed()}
          aria-label={t('label.menu')}
        >
          {/* Brand mark and toggle share the rail's head: the mark leads, the
              toggle sits at the inline-end beside it. Collapsed, the mark gives
              its place up to the toggle (CSS hides it) — the pattern bud.app and
              navbar.gallery use, and the one arrangement where the toggle costs
              no row, collides with nothing, and is the most visible thing on the
              rail exactly when the rail is hardest to read.
              Losing the mark on the rail costs no route home: the Dashboard
              entry directly below it goes to the same place. */}
          <div class={styles.logoArea}>
            <Show
              when={props.onHome}
              fallback={<AppLogo class={styles.logo} />}
            >
              <button
                type="button"
                class={styles.logoButton}
                data-testid="nav-home"
                onClick={props.onHome}
                aria-label={t('label.home')}
              >
                <AppLogo class={styles.logo} />
              </button>
            </Show>
            <button
              type="button"
              class={styles.railToggle}
              data-testid="drawer-toggle"
              onClick={props.nav.toggleRail}
              aria-label={
                props.nav.railCollapsed()
                  ? t('button.open-the-menu')
                  : t('button.close-the-menu')
              }
              aria-expanded={!props.nav.railCollapsed()}
            >
              {/* One glyph for both states: it names the panel it toggles, not
                  a direction, so there is nothing to flip. */}
              <SidebarIcon />
            </button>
          </div>
          <NavLists
            upper={props.upper}
            lower={props.lower}
            selectedId={props.selectedId}
            openSection={openSection()}
            onToggleSection={toggleSection}
            onSelect={select}
            rail={rail}
            syncBadge={props.syncBadge}
            syncIconDimmed={props.syncIconDimmed}
          />
          {/* The rail's collapse toggle, at the foot of the rail (spec/chrome
              § sidebar: an explicit toggle only, never hover — D3).
              Position is the point: this is furniture, pressed once and then
              left alone for weeks, so it belongs LAST in reading order rather
              than first. Every earlier spot gave it rank it had not earned —
              beside the brand mark, or leading the app bar on the page title's
              line, where it was the first thing read on the screen. Down here it
              is adjacent to the thing it controls, in the icon column so it
              never reaches into the page, and in the one part of the rail
              nothing else wants. */}
          {/* The rail's edge is a second explicit toggle (Linear's affordance).
              A click, so D3 is untouched — that rule forbids reacting to HOVER,
              and what hover does here is light the strip up, advertising the
              affordance rather than acting on it.
              Pointer-only (see the CSS): a 5px strip beside a scrolling table is
              a misfire magnet on touch, where the foot toggle already serves.
              Hidden from assistive tech and out of the tab order deliberately —
              it duplicates the button above it exactly, and two identical
              controls in the a11y tree is noise, not access. */}
          <button
            type="button"
            class={styles.railEdge}
            data-testid="drawer-edge-toggle"
            tabindex={-1}
            aria-hidden="true"
            title={
              props.nav.railCollapsed()
                ? t('button.open-the-menu')
                : t('button.close-the-menu')
            }
            onClick={props.nav.toggleRail}
          />
          <NavFlyout
            target={flyout()}
            selectedId={props.selectedId}
            onSelect={select}
            onDismiss={rail.close}
            onPointerEnter={clearTimers}
            onPointerLeave={rail.scheduleClose}
            ref={el => (panel = el)}
          />
        </nav>
      }
    >
      <div
        class={styles.scrim}
        data-open={props.nav.overlayOpen() ? 'true' : 'false'}
        onClick={props.nav.closeOverlay}
        aria-hidden="true"
      />
      <nav
        class={styles.overlayPanel}
        inert={props.inert}
        data-open={props.nav.overlayOpen() ? 'true' : 'false'}
        aria-label={t('label.menu')}
        aria-hidden={!props.nav.overlayOpen()}
      >
        <div class={styles.logoArea}>
          <AppLogo class={styles.logo} />
        </div>
        <NavLists
          upper={props.upper}
          lower={props.lower}
          selectedId={props.selectedId}
          openSection={openSection()}
          onToggleSection={toggleSection}
          onSelect={select}
          rail={rail}
          syncBadge={props.syncBadge}
          syncIconDimmed={props.syncIconDimmed}
        />
      </nav>
    </Show>
  );
};
