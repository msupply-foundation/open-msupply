import { MSupplyGuyLogo } from '@/components/icons';
import { upperNav, lowerNav } from './navModel';
import type { NavItem } from './navModel';
import { NavSection } from './NavSection';
import { NavLink } from './NavLink';
import { useSidebar } from './useSidebar';
import styles from './Sidebar.module.css';

interface SidebarProps {
  /** id of the active top-level section (e.g. 'distribution'). */
  activeSectionId?: string;
  /** id of the selected leaf/child (e.g. 'outbound'). */
  selectedId?: string;
}

const renderItem = (
  item: NavItem,
  activeSectionId?: string,
  selectedId?: string
) =>
  item.children ? (
    <NavSection
      key={item.id}
      item={item}
      active={item.id === activeSectionId}
      selectedChildId={selectedId}
      defaultOpen={item.id === activeSectionId}
    />
  ) : (
    <NavLink
      key={item.id}
      label={item.label}
      to={item.to}
      icon={item.icon}
      selected={item.id === selectedId}
    />
  );

export const Sidebar = ({ activeSectionId, selectedId }: SidebarProps) => {
  const { isOpen, toggle } = useSidebar(true);

  return (
    <nav
      className={styles.sidebar}
      data-open={isOpen}
      aria-label="Main navigation"
    >
      <div className={styles.logoArea}>
        <button
          type="button"
          className={styles.logoButton}
          onClick={toggle}
          aria-label={isOpen ? 'Collapse menu' : 'Expand menu'}
          aria-expanded={isOpen}
        >
          <MSupplyGuyLogo className={styles.logo} />
        </button>
      </div>

      <div className={styles.upper}>
        <ul className={styles.navList}>
          {upperNav.map(item =>
            renderItem(item, activeSectionId, selectedId)
          )}
        </ul>
      </div>

      <div className={styles.lower}>
        <ul className={styles.navList}>
          {lowerNav.map(item =>
            renderItem(item, activeSectionId, selectedId)
          )}
        </ul>
      </div>
    </nav>
  );
};
