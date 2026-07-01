import { upperNav, lowerNav } from './navModel';
import type { NavItem } from './navModel';
import { NavSection } from './NavSection';
import { NavLink } from './NavLink';
import styles from './Sidebar.module.css';

interface NavListsProps {
  activeSectionId?: string;
  selectedId?: string;
  /** Called when a link is followed — used to close the overlay on navigate. */
  onNavigate?: () => void;
}

const renderItem = (
  item: NavItem,
  activeSectionId: string | undefined,
  selectedId: string | undefined,
  onNavigate: (() => void) | undefined
) =>
  item.children ? (
    <NavSection
      key={item.id}
      item={item}
      active={item.id === activeSectionId}
      selectedChildId={selectedId}
      defaultOpen={item.id === activeSectionId}
      onNavigate={onNavigate}
    />
  ) : (
    <NavLink
      key={item.id}
      label={item.label}
      to={item.to}
      icon={item.icon}
      selected={item.id === selectedId}
      onNavigate={onNavigate}
    />
  );

/*
 * The nav item lists — shared verbatim by the docked sidebar and the mobile
 * overlay. ONE definition of the navigation; the two layout modes only differ in
 * their wrapper (see Sidebar), never in the nav itself.
 */
export const NavLists = ({
  activeSectionId,
  selectedId,
  onNavigate,
}: NavListsProps) => (
  <>
    <div className={styles.upper}>
      <ul className={styles.navList}>
        {upperNav.map(item =>
          renderItem(item, activeSectionId, selectedId, onNavigate)
        )}
      </ul>
    </div>
    <div className={styles.lower}>
      <ul className={styles.navList}>
        {lowerNav.map(item =>
          renderItem(item, activeSectionId, selectedId, onNavigate)
        )}
      </ul>
    </div>
  </>
);
