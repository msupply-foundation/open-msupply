import { For, Show, createSignal } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { MSupplyGuyLogo, ChevronDownIcon } from '../../icons'
import { upperNav, lowerNav, type NavItem, type NavLeaf } from './navModel'
import styles from './Sidebar.module.css'

export interface SidebarState {
  railCollapsed: () => boolean
  toggleRail: () => void
  overlayOpen: () => boolean
  openOverlay: () => void
  closeOverlay: () => void
}

interface SidebarProps {
  nav: SidebarState
  /** True below the navOverlay breakpoint — render the hamburger overlay. */
  isOverlay: boolean
  selectedId: string
  onSelect: (leaf: NavLeaf) => void
}

/*
 * A selected item shows the brand-orange end chevron at the inline-end edge.
 * Nav item layout, matching the current app: [icon][chevron|slot][label][end].
 */
const EndChevron = () => <ChevronDownIcon class={styles.endChevron} aria-hidden="true" />

/* Top-level leaf link: icon + empty chevron slot (so labels align with sections). */
const TopLeaf = (props: { item: NavItem; selected: boolean; onSelect: () => void }) => (
  <li class={styles.item}>
    <button
      type="button"
      class={styles.navButton}
      data-selected={props.selected ? 'true' : undefined}
      title={props.item.label}
      onClick={props.onSelect}
    >
      <span class={styles.icon}>
        <Dynamic component={props.item.icon} />
      </span>
      <span class={styles.chevronSlot} aria-hidden="true" />
      <span class={styles.label}>{props.item.label}</span>
      <Show when={props.selected}>
        <EndChevron />
      </Show>
    </button>
  </li>
)

/* Expandable parent: icon + collapse chevron (between icon and label) + label. */
const NavSection = (props: {
  item: NavItem
  selectedId: string
  onSelect: (leaf: NavLeaf) => void
}) => {
  const containsSelected = () =>
    props.item.children?.some((c) => c.id === props.selectedId) ?? false
  const [open, setOpen] = createSignal(containsSelected())

  return (
    <li class={styles.item}>
      <button
        type="button"
        class={styles.navButton}
        data-active={containsSelected() ? 'true' : undefined}
        aria-expanded={open()}
        title={props.item.label}
        onClick={() => setOpen((o) => !o)}
      >
        <span class={styles.icon}>
          <Dynamic component={props.item.icon} />
        </span>
        <ChevronDownIcon
          class={styles.sectionChevron}
          data-open={open() ? 'true' : 'false'}
          aria-hidden="true"
        />
        <span class={styles.label}>{props.item.label}</span>
      </button>
      <Show when={open()}>
        <ul class={styles.childList}>
          <For each={props.item.children}>
            {(leaf) => (
              <li class={styles.item}>
                <button
                  type="button"
                  class={styles.navButton}
                  data-selected={leaf.id === props.selectedId ? 'true' : undefined}
                  title={leaf.label}
                  onClick={() => props.onSelect(leaf)}
                >
                  <span class={styles.label}>{leaf.label}</span>
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
  )
}

const NavGroup = (props: {
  items: NavItem[]
  selectedId: string
  onSelect: (leaf: NavLeaf) => void
  class?: string
}) => (
  <ul class={`${styles.navList} ${props.class ?? ''}`}>
    <For each={props.items}>
      {(item) => (
        <Show
          when={item.children}
          fallback={
            <TopLeaf
              item={item}
              selected={item.id === props.selectedId}
              onSelect={() => props.onSelect({ id: item.id, label: item.label, to: item.to })}
            />
          }
        >
          <NavSection item={item} selectedId={props.selectedId} onSelect={props.onSelect} />
        </Show>
      )}
    </For>
  </ul>
)

const NavLists = (props: { selectedId: string; onSelect: (leaf: NavLeaf) => void }) => (
  <>
    <NavGroup
      items={upperNav}
      selectedId={props.selectedId}
      onSelect={props.onSelect}
      class={styles.upper}
    />
    <NavGroup
      items={lowerNav}
      selectedId={props.selectedId}
      onSelect={props.onSelect}
      class={styles.lower}
    />
  </>
)

/*
 * One sidebar, two layout modes — never a duplicate mobile nav component.
 *   - docked  (>= navOverlay): part of the flex row; logo toggles the icon rail.
 *   - overlay (<  navOverlay): off-canvas panel + scrim, opened by the header's
 *     hamburger; the SAME NavLists, closing on navigate or scrim tap.
 * Which mode renders is a "which element" decision — the one place a breakpoint
 * is allowed (via useIsNavOverlay in AppShell).
 */
export const Sidebar = (props: SidebarProps) => {
  const select = (leaf: NavLeaf) => {
    props.onSelect(leaf)
    if (props.isOverlay) props.nav.closeOverlay()
  }

  return (
    <Show
      when={props.isOverlay}
      fallback={
        <nav
          class={styles.sidebar}
          data-open={!props.nav.railCollapsed() ? 'true' : 'false'}
          aria-label="Main navigation"
        >
          <div class={styles.logoArea}>
            <button
              type="button"
              class={styles.logoButton}
              onClick={props.nav.toggleRail}
              aria-label={props.nav.railCollapsed() ? 'Expand menu' : 'Collapse menu'}
              aria-expanded={!props.nav.railCollapsed()}
            >
              <MSupplyGuyLogo class={styles.logo} />
            </button>
          </div>
          <NavLists selectedId={props.selectedId} onSelect={select} />
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
        aria-label="Main navigation"
        aria-hidden={!props.nav.overlayOpen()}
      >
        <div class={styles.logoArea}>
          <MSupplyGuyLogo class={styles.logo} />
        </div>
        <NavLists selectedId={props.selectedId} onSelect={select} />
      </nav>
    </Show>
  )
}
