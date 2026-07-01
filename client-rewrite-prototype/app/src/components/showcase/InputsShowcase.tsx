import type { ReactNode } from 'react';
import { TextField } from '@/components/ui/TextField';
import { cx } from '@/utils/classNames';
import styles from './InputsShowcase.module.css';

const Field = ({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cx(styles.cell, className)}>
    <span className={styles.caption}>{caption}</span>
    {children}
  </div>
);

/*
 * Storybook of the TextField (company input design spec). Laid out in a grid
 * that is AT MOST 2 columns and stacks to 1 when narrow — done intrinsically
 * (auto-fit + a capped width), no breakpoint.
 */
export const InputsShowcase = () => (
  <section className={styles.card}>
    <header className={styles.cardHeader}>Text Field States</header>
    <div className={styles.cardBody}>
      <div className={styles.grid}>
        <Field caption="Default">
          <TextField
            label="Item Code"
            placeholder="e.g. AMX500"
            helperText="Click to focus — orange ring appears"
          />
        </Field>
        <Field caption="Filled">
          <TextField label="Batch Number" defaultValue="B2487-594" />
        </Field>
        <Field caption="Required">
          <TextField
            label="Supplier Name"
            required
            placeholder="Enter supplier name"
            helperText="Asterisk on label — not placeholder"
          />
        </Field>
        <Field caption="Error">
          <TextField
            label="Quantity"
            type="number"
            defaultValue="-50"
            error="Quantity must be positive"
          />
        </Field>
        <Field caption="Disabled">
          <TextField
            label="Notes"
            placeholder="Add notes…"
            disabled
            helperText="Grey fill, muted border — not interactive"
          />
        </Field>
        <Field caption="Small · long" className={styles.fullRow}>
          <TextField
            label="Description"
            size="small"
            width="long"
            placeholder="Longer free-text field"
            helperText="Small height + the 'long' max-width cap (37.5rem / 600px) — wider than the 25rem 'short' default; spans the row so the cap is visible."
          />
        </Field>
      </div>
    </div>
  </section>
);
