import { For, Match, Show, Switch, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  MSupplyGuyLogo,
  ChevronDownIcon,
  AlertTriangleIcon,
} from '../../icons';
import { Badge } from '../../elements/feedback/Badge';
import { t } from '../../../intl';
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
  /** Status badge for the Sync entry (spec/chrome § sync indicator). */
  syncBadge?: NavBadge;
  /** Dim the Sync entry's icon while the latest run is errored. */
  syncIconDimmed?: boolean;
}

/*
 * A selected item shows the brand-orange end chevron at the inline-end edge.
 * Nav item layout, matching the current app: [icon][chevron|slot][label][end].
 */
const EndChevron = () => (
  <ChevronDownIcon class={styles.endChevron} aria-hidden="true" />
);

/**
 * Top-level leaf link: icon + empty chevron slot (so labels align with
 * sections).
 */
const TopLeaf = (props: {
  item: NavItem;
  selected: boolean;
  onSelect: () => void;
  badge?: NavBadge;
  iconDimmed?: boolean;
}) => (
  <li class={styles.item}>
    <button
      type="button"
      class={styles.navButton}
      data-selected={props.selected ? 'true' : undefined}
      title={t(props.item.labelKey)}
      onClick={props.onSelect}
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
      <Show when={props.selected}>
        <EndChevron />
      </Show>
    </button>
  </li>
);

/**
 * Expandable parent: icon + collapse chevron (between icon and label) + label.
 */
const NavSection = (props: {
  item: NavItem;
  selectedId: string;
  onSelect: (leaf: NavLeaf) => void;
}) => {
  const containsSelected = () =>
    props.item.children?.some(c => c.id === props.selectedId) ?? false;
  const [open, setOpen] = createSignal(containsSelected());

  return (
    <li class={styles.item}>
      <button
        type="button"
        class={styles.navButton}
        data-active={containsSelected() ? 'true' : undefined}
        aria-expanded={open()}
        title={t(props.item.labelKey)}
        onClick={() => setOpen(o => !o)}
      >
        <span class={styles.icon}>
          <Dynamic component={props.item.icon} />
        </span>
        <ChevronDownIcon
          class={styles.sectionChevron}
          data-open={open() ? 'true' : 'false'}
          aria-hidden="true"
        />
        <span class={styles.label}>{t(props.item.labelKey)}</span>
      </button>
      <Show when={open()}>
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
                  <Show when={leaf.id === props.selectedId}>
                    <EndChevron />
                  </Show>
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
  onSelect: (leaf: NavLeaf) => void;
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
            onSelect={props.onSelect}
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
  onSelect: (leaf: NavLeaf) => void;
  syncBadge?: NavBadge;
  syncIconDimmed?: boolean;
}) => (
  <>
    <NavGroup
      items={props.upper}
      selectedId={props.selectedId}
      onSelect={props.onSelect}
      class={styles.upper}
    />
    <Show when={props.lower?.length}>
      <NavGroup
        items={props.lower!}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        class={styles.lower}
        syncBadge={props.syncBadge}
        syncIconDimmed={props.syncIconDimmed}
      />
    </Show>
  </>
);

/*
 * One menu bar, two layout modes — never a duplicate mobile nav component.
 *   - docked  (>= navOverlay): part of the flex row; logo toggles the icon
 *     rail.
 * - overlay (<  navOverlay): off-canvas panel + scrim, opened by the header's
 *     hamburger; the SAME NavLists, closing on navigate or scrim tap. Which
 *     mode renders is a "which element" decision — the one place a breakpoint
 *     is allowed (via useIsNavOverlay in AppShell).
 */
export const MenuBar = (props: MenuBarProps) => {
  const select = (leaf: NavLeaf) => {
    props.onSelect(leaf);
    if (props.isOverlay) props.nav.closeOverlay();
  };

  return (
    <Show
      when={props.isOverlay}
      fallback={
        <nav
          class={styles.menuBar}
          data-open={!props.nav.railCollapsed() ? 'true' : 'false'}
          aria-label={t('menu')}
        >
          <div class={styles.logoArea}>
            <button
              type="button"
              class={styles.logoButton}
              onClick={props.nav.toggleRail}
              aria-label={
                props.nav.railCollapsed()
                  ? t('button.open-the-menu')
                  : t('button.close-the-menu')
              }
              aria-expanded={!props.nav.railCollapsed()}
            >
              <MSupplyGuyLogo class={styles.logo} />
            </button>
          </div>
          <NavLists
            upper={props.upper}
            lower={props.lower}
            selectedId={props.selectedId}
            onSelect={select}
            syncBadge={props.syncBadge}
            syncIconDimmed={props.syncIconDimmed}
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
        data-open={props.nav.overlayOpen() ? 'true' : 'false'}
        aria-label={t('shell.main-navigation')}
        aria-hidden={!props.nav.overlayOpen()}
      >
        <div class={styles.logoArea}>
          <MSupplyGuyLogo class={styles.logo} />
        </div>
        <NavLists
          upper={props.upper}
          lower={props.lower}
          selectedId={props.selectedId}
          onSelect={select}
          syncBadge={props.syncBadge}
          syncIconDimmed={props.syncIconDimmed}
        />
      </nav>
    </Show>
  );
};
