import { createSignal, type JSX } from 'solid-js';
import { TextField } from '../ui/elements/inputs/TextField';
import { DateField } from '../ui/elements/inputs/DateField';
import { DateTimeField } from '../ui/elements/inputs/DateTimeField';
import { TimeField } from '../ui/elements/inputs/TimeField';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { RadioGroup } from '../ui/elements/inputs/RadioGroup';
import styles from './InputsShowcase.module.css';

/** Today as ISO `YYYY-MM-DD`, for the "future dates unselectable" demo. */
const todayIso = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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
 * Storybook of the input + form-layout elements: the TextField (company input
 * design spec), the RadioGroup (native single-choice), and FieldRow (inline
 * label + control) — the form-composition piece that pairs with them inside a
 * dialog/panel. InsetPanel, the recessed grouping container, is a layout
 * element (see the Layout › Inset panel section).
 */
export const InputsShowcase = () => {
  // RadioGroup demo: a stocktake-type choice, plus an indented include-all
  // sub-choice — the exact shape the create-stocktake modal uses.
  const [stocktakeType, setStocktakeType] = createSignal('full');
  const [includeAll, setIncludeAll] = createSignal('soh');

  // Date & time demo: an expiry (plain ISO date, passes straight through) and
  // an appointment instant stored in UTC — the caption shows the stored UTC
  // value so the local↔UTC boundary is visible.
  const [expiry, setExpiry] = createSignal<string | null>('2027-03-01');
  const [appointment, setAppointment] = createSignal<string | null>(
    '2026-07-17T02:30:00.000Z'
  );
  const [cutoff, setCutoff] = createSignal<string | null>('17:30');

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
        title="Date & time — native inputs"
        lead={
          <>
            <code>DateField</code>, <code>DateTimeField</code> and{' '}
            <code>TimeField</code>: native <code>date</code> /{' '}
            <code>datetime-local</code> / <code>time</code> inputs wrapped in{' '}
            <code>TextField</code> for the shared chrome — no library, zero
            bundle, free keyboard entry and mobile pickers. The in-field parts
            are <strong>brand-styled</strong> (our own calendar/clock glyph,
            token-tinted, orange-highlighted segments — try dark mode); the
            pop-up calendar/time overlay is the platform's own control.{' '}
            <code>DateField</code>'s value <em>is</em> the wire value (ISO{' '}
            <code>YYYY-MM-DD</code>, no timezone); <code>TimeField</code>'s is a
            plain <code>HH:mm</code>. <code>DateTimeField</code> stores a{' '}
            <strong>UTC instant</strong> but lets the user edit their{' '}
            <strong>local wall-clock</strong> time — converting on the boundary
            using the device timezone.
          </>
        }
      >
        <div class={styles.grid}>
          <Field caption="Date">
            <DateField
              label="Expiry date"
              value={expiry()}
              onChange={setExpiry}
              helperText={`Stored: ${expiry() ?? '(empty)'}`}
            />
          </Field>
          <Field caption="Bounded — future unselectable">
            <DateField
              label="Manufacture date"
              max={todayIso()}
              helperText="max = today; later dates greyed out in the picker"
            />
          </Field>
          <Field caption="Time — clock picker">
            <TimeField
              label="Cut-off time"
              value={cutoff()}
              onChange={setCutoff}
              helperText={`Stored (HH:mm): ${cutoff() ?? '(empty)'}`}
            />
          </Field>
          <Field caption="Required">
            <DateField
              label="Count date"
              required
              helperText="Asterisk on label — not placeholder"
            />
          </Field>
          <Field caption="Error">
            <DateField
              label="Expiry date"
              value="2020-01-01"
              error="Date is in the past"
            />
          </Field>
          <Field caption="Disabled">
            <DateField
              label="Locked date"
              value="2026-07-17"
              disabled
              helperText="Grey fill — not interactive"
            />
          </Field>
          <Field
            caption="Date & time — local edit, UTC store"
            class={styles.fullRow}
          >
            <DateTimeField
              label="Appointment"
              value={appointment()}
              onChange={setAppointment}
              helperText={`You edit local wall-clock; stored as UTC: ${
                appointment() ?? '(empty)'
              }`}
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
                // Disabled to show the per-option disabled state (as the modal
                // greys "All items").
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
