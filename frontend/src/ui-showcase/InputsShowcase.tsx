import { createSignal, type JSX } from 'solid-js';
import { TextField } from '../ui/elements/inputs/TextField';
import { TextArea } from '../ui/elements/inputs/TextArea';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { RadioGroup } from '../ui/elements/inputs/RadioGroup';
import { Checkbox } from '../ui/elements/inputs/Checkbox';
import { ToggleSwitch } from '../ui/elements/inputs/ToggleSwitch';
import { DateInput } from '../ui/elements/inputs/DateInput';
import { DateRangeInput } from '../ui/elements/inputs/DateRangeInput';
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
 * Storybook of the input + form-layout elements: the TextField (company input
 * design spec), the TextArea (the same spec, multi-line), the RadioGroup
 * (native single-choice), the Checkbox (native plain checkbox), and FieldRow
 * (inline label + control) — the form-composition piece that pairs with them
 * inside a dialog/panel. InsetPanel, the recessed grouping container, is a
 * layout element (see the Layout › Inset panel section).
 */
export const InputsShowcase = () => {
  // RadioGroup demo: a stocktake-type choice, plus an indented include-all
  // sub-choice — the exact shape the create-stocktake modal uses.
  const [stocktakeType, setStocktakeType] = createSignal('full');
  const [includeAll, setIncludeAll] = createSignal('soh');
  // Checkbox / ToggleSwitch demos.
  const [countZero, setCountZero] = createSignal(true);
  const [confirmed, setConfirmed] = createSignal(false);
  const [showFinalised, setShowFinalised] = createSignal(false);
  // Date + range demos (ISO strings in/out).
  const [expiry, setExpiry] = createSignal('2026-09-30');
  const [range, setRange] = createSignal({ start: '', end: '' });
  const rangeError = () =>
    range().start && range().end && range().end < range().start
      ? 'End date must not be before the start date.'
      : undefined;

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
        title="Multi-line text — native <textarea>"
        lead={
          <>
            The TextField spec on a plain HTML <code>&lt;textarea&gt;</code> —
            same border, focus ring, label and helper/error wiring. The{' '}
            <code>rows</code> prop sets the visible lines (default 4, as the old
            OMS TextArea); the height is fixed — longer content scrolls, no
            resize grip. Defaults to full width (<code>width</code> caps it, as
            TextField).
          </>
        }
      >
        <div class={styles.grid}>
          <Field caption="Default (4 rows)">
            <TextArea
              label="Comment"
              placeholder="Add a comment…"
              helperText="Four visible lines by default — longer content scrolls"
            />
          </Field>
          <Field caption="rows={2} · filled">
            <TextArea
              label="Notes"
              rows={2}
              value={
                'Damaged carton on arrival.\nPhotos attached to the claim.'
              }
            />
          </Field>
          <Field caption="Error">
            <TextArea
              label="Reason"
              rows={2}
              required
              value=""
              error="A reason is required"
            />
          </Field>
          <Field caption="Disabled">
            <TextArea
              label="Instructions"
              rows={2}
              placeholder="No instructions"
              disabled
              helperText="Grey fill, muted border — not interactive"
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
            radiogroup/radio ARIA for free; we draw the control ourselves (brand
            rim + dot, the gap between them transparent —{' '}
            <code>accent-color</code> painted it white in both themes) and lay
            the label — with an optional muted description — beside it. Options
            can be individually <code>disabled</code>, and{' '}
            <code>indentRem</code> lines a sub-group up under a sibling control.
            This is the create-stocktake type + include-all choice.
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

      <Card
        title="Checkbox — native <input type=checkbox>"
        lead={
          <>
            A labelled checkbox on the native control — no library. The real
            input is visually hidden (kept for a11y + as the state owner); a
            styled box + check glyph read the <code>:checked</code> /{' '}
            <code>:focus-visible</code> state off it. The label click toggles
            it; an <code>error</code> shows an icon + message (never colour
            alone). Label typography matches TextField.
          </>
        }
      >
        <div class={styles.formPreview}>
          <Checkbox
            label="Count items with zero stock"
            checked={countZero()}
            onChange={setCountZero}
          />
          <Checkbox
            label="I have physically counted every line"
            checked={confirmed()}
            onChange={setConfirmed}
            error={
              confirmed() ? undefined : 'Confirm the count before finalising.'
            }
          />
          <Checkbox label="Disabled option" disabled checked />
        </div>
      </Card>

      <Card
        title="Toggle switch — on/off toggle (role=switch)"
        lead={
          <>
            The native checkbox re-cast as a switch (<code>role="switch"</code>
            ): a custom track + sliding thumb, the state carried by the thumb
            position. Space toggles it; the label click toggles it. For a binary
            on/off setting where a slider reads more naturally than a tick box.
          </>
        }
      >
        <div class={styles.formPreview}>
          <ToggleSwitch
            label="Show finalised stocktakes"
            checked={showFinalised()}
            onChange={setShowFinalised}
          />
          <ToggleSwitch label="Disabled switch" disabled checked />
        </div>
      </Card>

      <Card
        title="Date input & range — native <input type=date>"
        lead={
          <>
            <code>DateInput</code> is the native date picker with TextField's
            exact label / helper / error / required API — it <em>is</em> a
            TextField (<code>type="date"</code>), so there's no new styling and
            the browser owns the picker. <code>DateRangeInput</code> pairs two
            of them in one labelled row and constrains them by construction
            (start's <code>max</code> = end, end's <code>min</code> = start),
            with one combined error slot — try to set the end before the start.
          </>
        }
      >
        <div class={styles.formPreview}>
          <DateInput
            label="Expiry date"
            value={expiry()}
            onChange={setExpiry}
            helperText="ISO value in and out"
          />
          <DateRangeInput
            label="Created between"
            start={range().start}
            end={range().end}
            onChange={setRange}
            error={rangeError()}
          />
        </div>
      </Card>
    </div>
  );
};
