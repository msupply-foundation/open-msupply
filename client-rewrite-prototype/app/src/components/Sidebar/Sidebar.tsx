import { MSupplyGuyLogo } from '@/components/icons';
import { cx } from '@/utils/classNames';
import { NavLists } from './NavLists';
import type { SidebarState } from './useSidebar';
import styles from './Sidebar.module.css';

interface SidebarProps {
  nav: SidebarState;
  /** True below the navOverlay breakpoint — render the hamburger overlay. */
  isOverlay: boolean;
  activeSectionId?: string;
  selectedId?: string;
}

/*
 * One sidebar, two layout modes — never a duplicate mobile nav component.
 *   - docked  (>= navOverlay): part of the flex row; logo toggles the icon rail.
 *   - overlay (<  navOverlay): off-canvas panel + scrim, opened by the Header's
 *     hamburger; the SAME NavLists, closing on navigate or scrim tap.
 * Which mode is a "which element do I render" decision — the one place a
 * breakpoint is allowed (via useIsNavOverlay in App).
 */
export const Sidebar = ({
  nav,
  isOverlay,
  activeSectionId,
  selectedId,
}: SidebarProps) => {
  if (isOverlay) {
    return (
      <>
        <div
          className={cx(styles.scrim, nav.overlayOpen && styles.scrimOpen)}
          onClick={nav.closeOverlay}
          aria-hidden
        />
        <nav
          className={styles.overlayPanel}
          data-open={nav.overlayOpen}
          aria-label="Main navigation"
          aria-hidden={!nav.overlayOpen}
        >
          <div className={styles.logoArea}>
            <MSupplyGuyLogo className={styles.logo} />
          </div>
          <NavLists
            activeSectionId={activeSectionId}
            selectedId={selectedId}
            onNavigate={nav.closeOverlay}
          />
        </nav>
      </>
    );
  }

  return (
    <nav
      className={styles.sidebar}
      data-open={!nav.railCollapsed}
      aria-label="Main navigation"
    >
      <div className={styles.logoArea}>
        <button
          type="button"
          className={styles.logoButton}
          onClick={nav.toggleRail}
          aria-label={nav.railCollapsed ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!nav.railCollapsed}
        >
          <MSupplyGuyLogo className={styles.logo} />
        </button>
      </div>
      <NavLists activeSectionId={activeSectionId} selectedId={selectedId} />
    </nav>
  );
};
