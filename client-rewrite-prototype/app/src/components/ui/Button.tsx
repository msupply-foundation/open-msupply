import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/utils/classNames';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  /** 'default' = white pill (current app's toolbar style); 'primary' = filled orange. */
  variant?: 'default' | 'primary';
}

/*
 * Reusable action button — plain <button> + CSS, no headless lib needed. Mirrors
 * the current app's ButtonWithIcon (white pill, orange icon) with a `variant`
 * seam for a filled/primary style later.
 */
export const Button = ({
  icon,
  variant = 'default',
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={cx(styles.button, styles[variant], className)}
    {...rest}
  >
    {icon && <span className={styles.icon}>{icon}</span>}
    {children && <span className={styles.label}>{children}</span>}
  </button>
);
