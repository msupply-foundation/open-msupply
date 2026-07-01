import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required for a11y — becomes the dialog's accessible name (Radix Title). */
  title: string;
  icon?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Footer buttons (rendered inline-end). */
  actions?: ReactNode;
}

/*
 * Modal dialog — Radix Dialog (headless).
 *
 * Why not plain HTML (this one really looks like it should be)? A modal's *look*
 * is trivial, but its a11y/interaction contract is the hard part and WCAG grades
 * it: focus TRAP while open, focus RESTORE to the trigger on close, initial
 * focus, Escape + scrim-click to dismiss, role="dialog" + aria-modal,
 * aria-labelledby / -describedby wiring, scroll lock, and aria-hidden on the rest
 * of the page. The native <dialog> element covers only some of this (focus
 * restore, trap robustness and background-inert behaviour vary across browsers)
 * and is imperative to drive from React (showModal()/close() + refs) rather than
 * a clean controlled `open`. Radix gives all of it declaratively for ~1 KB, and
 * we still own 100% of the markup + CSS. (No Floating UI — it's centred.)
 *
 * Usage pattern for modals: keep `open` state in the component that owns the
 * action, render this declaratively next to it, and drive it with
 * open / onOpenChange. For confirmations use <ConfirmDialog>, which is built on
 * this.
 */
export const Dialog = ({
  open,
  onOpenChange,
  title,
  icon,
  description,
  children,
  actions,
}: DialogProps) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={styles.overlay} />
      <RadixDialog.Content className={styles.content}>
        <div className={styles.header}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
        </div>
        {description && (
          <RadixDialog.Description className={styles.description}>
            {description}
          </RadixDialog.Description>
        )}
        {children}
        {actions && <div className={styles.actions}>{actions}</div>}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);
