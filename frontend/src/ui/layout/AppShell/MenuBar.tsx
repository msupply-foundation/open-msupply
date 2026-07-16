import { For, Show, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { MSupplyGuyLogo, ChevronDownIcon } from '../../icons';
import { t } from '../../../intl';
import type { NavItem, NavLeaf } from './navModel';
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
}) => (
  <li class={styles.item}>
    <button
      type="button"
      class={styles.navButton}
      data-selected={props.selected ? 'true' : undefined}
      title={t(props.item.labelKey)}
      onClick={props.onSelect}
    >
      <span class={styles.icon}>
        <Dynamic component={props.item.icon} />
      </span>
      <span class={styles.chevronSlot} aria-hidden="true" />
      <span class={styles.label}>{t(props.item.labelKey)}</span>
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
          aria-label={t('shell.main-navigation')}
        >
          <div class={styles.logoArea}>
            <button
              type="button"
              class={styles.logoButton}
              onClick={props.nav.toggleRail}
              aria-label={
                props.nav.railCollapsed()
                  ? t('shell.expand-menu')
                  : t('shell.collapse-menu')
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
        />
      </nav>
    </Show>
  );
};
