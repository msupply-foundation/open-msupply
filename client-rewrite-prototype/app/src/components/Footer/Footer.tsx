import type { ReactNode } from 'react';
import {
  HomeIcon,
  EditIcon,
  UserIcon,
  CentralIcon,
} from '@/components/icons';
import { LanguageSelector } from './LanguageSelector';
import styles from './Footer.module.css';

interface CellProps {
  icon: ReactNode;
  text: string;
  onClick?: () => void;
}

const Cell = ({ icon, text, onClick }: CellProps) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={styles.cell}
      onClick={onClick}
    >
      {icon}
      <span className={styles.cellText}>{text}</span>
    </Tag>
  );
};

/*
 * The orange app footer. Mirrors the current host Footer: store / edit /
 * user / language on the inline-start, "Central server" pushed to the
 * inline-end. Orange background + white content = central-server styling.
 */
export const Footer = () => (
  <footer className={styles.footer}>
    <Cell icon={<HomeIcon className={styles.icon} />} text="General" />
    <Cell
      icon={<EditIcon className={styles.icon} />}
      text="Edit"
      onClick={() => {}}
    />
    <span className={styles.divider} />
    <Cell icon={<UserIcon className={styles.icon} />} text="demo" />
    <span className={styles.divider} />
    <LanguageSelector />
    <Cell
      icon={<CentralIcon className={styles.icon} />}
      text="Central server"
    />
  </footer>
);
