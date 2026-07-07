import type { JSX } from 'solid-js'
import { TextField } from '../components/ui/TextField'
import styles from './InputsShowcase.module.css'

const Field = (props: {
  caption: string
  class?: string
  children: JSX.Element
}) => (
  <div class={props.class ? `${styles.cell} ${props.class}` : styles.cell}>
    <span class={styles.caption}>{props.caption}</span>
    {props.children}
  </div>
)

/*
 * Storybook of the TextField (company input design spec). Laid out in a grid
 * that is AT MOST 2 columns and stacks to 1 when narrow — done intrinsically
 * (auto-fit + a capped width), no breakpoint.
 */
export const InputsShowcase = () => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>Text Field States</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>
        The company-spec text input: a plain HTML <code>&lt;input&gt;</code> +
        CSS, no library — label, helper/error message, required marker, two
        heights and the short/long width caps. Every colour is a theme token
        (the red error glow is <code>--focus-ring-error</code>, themed for dark
        alongside <code>--focus-ring</code>). Click into a field for the orange
        focus ring; error and required are never conveyed by colour alone.
      </p>
      <div class={styles.grid}>
        <Field caption="Default">
          <TextField
            label="Item Code"
            placeholder="e.g. AMX500"
            helperText="Click to focus — orange ring appears"
          />
        </Field>
        <Field caption="Filled">
          <TextField label="Batch Number" value="B2487-594" />
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
            value="-50"
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
        <Field caption="Small · long" class={styles.fullRow}>
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
)
