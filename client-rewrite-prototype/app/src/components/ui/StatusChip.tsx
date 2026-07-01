import type { CSSProperties } from 'react';
import { cx } from '@/utils/classNames';
import styles from './StatusChip.module.css';

interface StatusChipProps {
  label: string;
  /** Any CSS colour — carried by the dot and a tinted pill background. */
  colour: string;
  className?: string;
}

/*
 * Status chip — deliberately hand-rolled (no library). A chip has no
 * interaction or accessibility contract to buy: it's a coloured dot + a label
 * on a tinted pill. Mirrors the current app's StatusChip (dot + pale
 * background at low opacity), but the pill tint is derived from the single
 * colour with `color-mix`, so one prop drives both. The label keeps the normal
 * text colour for contrast; the colour reads from the dot + tint.
 */
export const StatusChip = ({ label, colour, className }: StatusChipProps) => (
  <span
    className={cx(styles.chip, className)}
    style={{ '--chip-colour': colour } as CSSProperties}
  >
    <span className={styles.dot} aria-hidden />
    {label}
  </span>
);
