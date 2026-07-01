import type { ComponentType } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import type { IconProps } from '@/components/icons';
import styles from './Sidebar.module.css';

interface NavLinkProps {
  label: string;
  to: string;
  selected?: boolean;
  /** Top-level links show an icon + chevron slot; children are text-only. */
  icon?: ComponentType<IconProps>;
  variant?: 'top' | 'child';
}

export const NavLink = ({
  label,
  to,
  selected = false,
  icon: Icon,
  variant = 'top',
}: NavLinkProps) => (
  <li className={styles.item}>
    <a
      href={to}
      className={styles.navButton}
      data-selected={selected}
      aria-current={selected ? 'page' : undefined}
      title={label}
    >
      {variant === 'top' &&
        (Icon ? (
          <span className={styles.icon}>
            <Icon />
          </span>
        ) : (
          <span className={styles.icon} aria-hidden />
        ))}
      {/* Reserve the chevron slot so leaf labels line up with section labels */}
      {variant === 'top' && <span className={styles.chevronSlot} aria-hidden />}
      <span className={styles.label}>{label}</span>
      {selected && (
        <ChevronDownIcon className={styles.endChevron} aria-hidden />
      )}
    </a>
  </li>
);
