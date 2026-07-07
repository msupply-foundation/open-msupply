import { createSignal, createEffect, Show, type JSX, type Component } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
  MenuIcon,
  SearchIcon,
  HomeIcon,
  EditIcon,
  UserIcon,
  TranslateIcon,
  CentralIcon,
  type IconProps,
} from '../../icons'
import { useIsNavOverlay } from '../../../hooks/createMediaQuery'
import { Sidebar, type SidebarState } from './Sidebar'
import type { NavLeaf } from './navModel'
import styles from './AppShell.module.css'

interface AppShellProps {
  /** Body is a render-prop so the demo content can reflect the selected page. */
  children: (selected: NavLeaf) => JSX.Element
}

const DEFAULT_SELECTED: NavLeaf = {
  id: 'outbound',
  label: 'Outbound Shipments',
  to: '/distribution/outbound-shipment',
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
 * Whole-page application shell: docked sidebar + main column (header, scrolling
 * body, footer). The one responsive decision — docked rail vs. hamburger
 * overlay — is driven by useIsNavOverlay; everything else is intrinsic layout.
 * A layout element, not a component: it owns the page frame, the page owns the
 * body content. Adapted from the RnD prototype's App shell.
 */
export const AppShell = (props: AppShellProps) => {
  const [railCollapsed, setRailCollapsed] = createSignal(false)
  const [overlayOpen, setOverlayOpen] = createSignal(false)
  const [selected, setSelected] = createSignal<NavLeaf>(DEFAULT_SELECTED)
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

  return (
    <div class={styles.shell}>
      <Sidebar
        nav={nav}
        isOverlay={isOverlay()}
        selectedId={selected().id}
        onSelect={setSelected}
      />
      <div class={styles.main}>
        <header class={styles.header}>
          <Show when={isOverlay()}>
            <button
              type="button"
              class={styles.hamburger}
              onClick={nav.openOverlay}
              aria-label="Open navigation"
            >
              <MenuIcon class={styles.hamburgerIcon} />
            </button>
          </Show>
          <div class={styles.crumbs}>
            <span class={styles.crumbRoot}>Distribution</span>
            <span class={styles.crumbSep} aria-hidden="true">
              /
            </span>
            <h1 class={styles.crumbLeaf}>{selected().label}</h1>
          </div>
          <div class={styles.headerActions}>
            <div class={styles.search}>
              <SearchIcon class={styles.searchIcon} />
              <input
                class={styles.searchInput}
                type="search"
                placeholder="Search…"
                aria-label="Search"
              />
            </div>
            <button type="button" class={styles.newButton}>
              New
            </button>
          </div>
        </header>

        <div class={styles.body}>{props.children(selected())}</div>

        <footer class={styles.footer}>
          <FooterCell icon={HomeIcon} label="General" />
          <FooterCell icon={EditIcon} label="Edit" onClick={() => {}} />
          <span class={styles.footerDivider} aria-hidden="true" />
          <FooterCell icon={UserIcon} label="demo" />
          <span class={styles.footerDivider} aria-hidden="true" />
          <FooterCell icon={TranslateIcon} label="English" onClick={() => {}} />
          <FooterCell icon={CentralIcon} label="Central server" />
        </footer>
      </div>
    </div>
  )
}
