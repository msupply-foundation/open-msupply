import { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDownIcon } from '@/components/icons';
import type { NavItem } from './navModel';
import { NavLink } from './NavLink';
import styles from './Sidebar.module.css';

interface NavSectionProps {
  item: NavItem;
  /** Highlights the parent (orange) when one of its routes is active. */
  active?: boolean;
  /** id of the currently-selected child, if any. */
  selectedChildId?: string;
  defaultOpen?: boolean;
  onNavigate?: () => void;
}

/*
 * An expandable parent section. Radix Collapsible owns the disclosure: it wires
 * aria-expanded / aria-controls onto the trigger and exposes
 * --radix-collapsible-content-height for the smooth open/close animation. We own
 * all the markup and CSS; the Icon is the brand-orange (currentColor) icon.
 */
export const NavSection = ({
  item,
  active = false,
  selectedChildId,
  defaultOpen = false,
  onNavigate,
}: NavSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const { icon: Icon } = item;

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={styles.section}
      asChild
    >
      <li className={styles.item}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className={styles.navButton}
            data-active={active}
            title={item.label}
          >
            <span className={styles.icon}>
              <Icon />
            </span>
            <ChevronDownIcon
              className={styles.sectionChevron}
              data-open={open}
              aria-hidden
            />
            <span className={styles.label}>{item.label}</span>
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content className={styles.sectionContent}>
          <ul className={styles.childList}>
            {item.children?.map(child => (
              <NavLink
                key={child.id}
                label={child.label}
                to={child.to}
                variant="child"
                selected={child.id === selectedChildId}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </Collapsible.Content>
      </li>
    </Collapsible.Root>
  );
};
