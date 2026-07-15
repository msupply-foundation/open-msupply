import { createSignal, type JSX } from 'solid-js';
import { TextField } from '../ui/elements/inputs/TextField';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { InsetPanel } from '../ui/elements/inputs/InsetPanel';
import { RadioGroup } from '../ui/elements/inputs/RadioGroup';
import styles from './InputsShowcase.module.css';

const Field = (props: {
  caption: string;
  class?: string;
  children: JSX.Element;
}) => (
  <div class={props.class ? `${styles.cell} ${props.class}` : styles.cell}>
    <span class={styles.caption}>{props.caption}</span>
    {props.children}
  </div>
);

const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
);

/*
 * Storybook of the input + form-layout elements: the TextField (company input design spec),
 * the RadioGroup (native single-choice), and the two form-composition pieces that pair with
 * them inside a dialog/panel — FieldRow (inline label + control) and InsetPanel (grouping).
 */
export const InputsShowcase = () => {
  // RadioGroup demo: a stocktake-type choice, plus an indented include-all sub-choice — the
  // exact shape the create-stocktake modal uses.
  const [stocktakeType, setStocktakeType] = createSignal('full');
  const [includeAll, setIncludeAll] = createSignal('soh');

  return (
    <div class={styles.stack}>
      <Card
        title="Text field states"
        lead={
          <>
            The company-spec text input: a plain HTML <code>&lt;input&gt;</code>{' '}
            + CSS, no library — label, helper/error message, required marker,
            two heights and the short/long width caps. Every colour is a theme
            token (the red error glow is <code>--focus-ring-error</code>, themed
            for dark alongside <code>--focus-ring</code>). Click into a field
            for the orange focus ring; error and required are never conveyed by
            colour alone.
          </>
        }
      >
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
      </Card>

      <Card
        title="Field row — inline label + control"
        lead={
          <>
            A compact form row: a bold label on the inline-start, the control
            filling the inline-end — the app's dense dialog/panel layout (the
            create-stocktake filter rows). Hand-rolled layout only; the wrapped
            control keeps its own look but hides its own label (via{' '}
            <code>hideLabel</code>) so this row is the single visible label,
            announced to assistive tech. RTL-safe (logical properties).
          </>
        }
      >
        <div class={styles.formPreview}>
          <FieldRow label="Master list">
            <TextField label="Master list" hideLabel placeholder="Any" />
          </FieldRow>
          <FieldRow label="Location">
            <TextField label="Location" hideLabel placeholder="Any" />
          </FieldRow>
          <FieldRow label="Expiring before">
            <TextField label="Expiring before" hideLabel type="date" />
          </FieldRow>
        </div>
      </Card>

      <Card
        title="Inset panel — recessed grouping"
        lead={
          <>
            A recessed grey panel that groups related controls, with an optional
            muted <code>hint</code> line at the top — the app's "extra options"
            area inside a dialog (the create-stocktake include-all / filter
            block). Hand-rolled, pure CSS + tokens: no interaction or a11y
            contract to buy, just a tinted rounded container. Pairs with{' '}
            <code>FieldRow</code>.
          </>
        }
      >
        <div class={styles.formPreview}>
          <InsetPanel hint="Counts items matching the filters below.">
            <FieldRow label="Master list">
              <TextField label="Master list" hideLabel placeholder="Any" />
            </FieldRow>
            <FieldRow label="Location">
              <TextField label="Location" hideLabel placeholder="Any" />
            </FieldRow>
          </InsetPanel>
        </div>
      </Card>

      <Card
        title="Radio group — native <input type=radio>"
        lead={
          <>
            Single choice among fixed options — the "own the simple" case with{' '}
            <strong>no</strong> library. A shared <code>name</code> gives the
            browser single-select grouping, roving arrow-key focus and the
            radiogroup/radio ARIA for free; we only style the native control
            with <code>accent-color</code> (the brand dot) and lay the label —
            with an optional muted description — beside it. Options can be
            individually <code>disabled</code>, and <code>indentRem</code> lines
            a sub-group up under a sibling control. This is the create-stocktake
            type + include-all choice.
          </>
        }
      >
        <div class={styles.formPreview}>
          <RadioGroup
            label="Stocktake type"
            value={stocktakeType()}
            onChange={setStocktakeType}
            options={[
              {
                value: 'full',
                label: 'Full stocktake',
                description: 'Counts every item in the store.',
              },
              {
                value: 'filtered',
                label: 'Filtered stocktake',
                description: 'Counts items matching the filters.',
              },
              {
                value: 'blank',
                label: 'Blank stocktake',
                description: 'Creates an empty stocktake.',
              },
            ]}
          />
          <div class={styles.radioSubgroup}>
            <RadioGroup
              label="Which items"
              value={includeAll()}
              onChange={setIncludeAll}
              indentRem={0.2}
              options={[
                { value: 'soh', label: 'Items with stock on hand' },
                // Disabled to show the per-option disabled state (as the modal greys "All items").
                {
                  value: 'all',
                  label: 'All items',
                  disabled: stocktakeType() === 'blank',
                },
              ]}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
