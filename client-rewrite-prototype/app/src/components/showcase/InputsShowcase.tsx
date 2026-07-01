import type { ReactNode } from 'react';
import { TextField } from '@/components/ui/TextField';
import styles from './InputsShowcase.module.css';

const Field = ({ caption, children }: { caption: string; children: ReactNode }) => (
  <div className={styles.cell}>
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
        <Field caption="Small · long">
          <TextField
            label="Description"
            size="small"
            width="long"
            placeholder="Longer free-text field (max 37.5rem)"
          />
        </Field>
      </div>
    </div>
  </section>
);
