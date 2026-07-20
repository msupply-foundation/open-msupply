import { createSignal, type JSX } from 'solid-js';
import { TextField } from '../ui/elements/inputs/TextField';
import { TextArea } from '../ui/elements/inputs/TextArea';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { CurrencyField } from '../ui/elements/inputs/CurrencyField';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { RadioGroup } from '../ui/elements/inputs/RadioGroup';
import { Checkbox } from '../ui/elements/inputs/Checkbox';
import { ToggleSwitch } from '../ui/elements/inputs/ToggleSwitch';
import { DateField } from '../ui/elements/inputs/DateField';
import { DateTimeField } from '../ui/elements/inputs/DateTimeField';
import { TimeField } from '../ui/elements/inputs/TimeField';
import {
  DateRangeField,
  type IsoDateRange,
} from '../ui/elements/inputs/DateRangeField';
import { Button } from '../ui/elements/buttons/Button';
import { Select } from '../ui/elements/selectors/Select';
import {
  getCurrencyInfo,
  homeCurrency,
  locale,
  setHomeCurrency,
} from '../intl';
import styles from './InputsShowcase.module.css';

// Mock source for the home-currency selector: the currencies old OMS shipped
// hand-configured. The real source is the entered store's homeCurrencyCode —
// see the TODO in src/intl/currency.ts; this selector stands in until then.
const MOCK_STORE_CURRENCIES = [
  'USD',
  'EUR',
  'CDF',
  'NZD',
  'DJF',
  'QAR',
  'RUB',
  'SSP',
  'PGK',
  'COP',
  'SBD',
  'KMF',
  'XAF',
  'XOF',
  'STN',
  'AFN',
];

/** The parent-state line under each NumberField demo: the committed value —
 *  a number (or undefined), as distinct from the text in the field. */
const ValueReadout = (props: { value: number | undefined }) => (
  <output class={styles.valueReadout}>
    value:{' '}
    <code>
      {props.value === undefined ? 'undefined' : JSON.stringify(props.value)}
    </code>
  </output>
);

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
  // Date & time demos (ISO strings / UTC instant in/out).
  const [expiry, setExpiry] = createSignal<string | null>('2027-03-01');
  const [invoiceDate, setInvoiceDate] = createSignal<string | null>(
    '2023-04-23'
  );
  const [expiringBefore, setExpiringBefore] = createSignal<string | null>(null);
  const [manufacture, setManufacture] = createSignal<string | null>(null);
  const [countDate, setCountDate] = createSignal<string | null>(null);
  const [cutoff, setCutoff] = createSignal<string | null>('17:30');
  const [appointment, setAppointment] = createSignal<string | null>(
    '2026-07-17T02:30:00.000Z'
  );
  const [period, setPeriod] = createSignal<IsoDateRange>({
    start: '2026-07-01',
    end: '2026-07-31',
  });
  // NumberField demos: the parent-owned numbers each ValueReadout displays.
  const [qty, setQty] = createSignal<number | undefined>(1000);
  const [cost, setCost] = createSignal<number | undefined>(12.5);
  const [adjustment, setAdjustment] = createSignal<number | undefined>();
  const [packSize, setPackSize] = createSignal<number | undefined>(12);
  const [year, setYear] = createSignal<number | undefined>(2026);
  const [raceValue, setRaceValue] = createSignal<number | undefined>();
  const [savedValue, setSavedValue] = createSignal<number | undefined>();
  const [raceSaves, setRaceSaves] = createSignal(0);
  // CurrencyField demos. The home-currency mock selector drives the global
  // homeCurrency signal, so the un-propped field follows it live.
  const [price, setPrice] = createSignal<number | undefined>(1234.5);
  const [eurPrice, setEurPrice] = createSignal<number | undefined>(99.95);
  const [yenPrice, setYenPrice] = createSignal<number | undefined>(5800);
  const [unitCost, setUnitCost] = createSignal<number | undefined>(1.5025);
  const [sbdPrice, setSbdPrice] = createSignal<number | undefined>();

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
        title="Number field — numeric input over TextField"
        lead={
          <>
            The old OMS NumericTextInput rebuilt: a TextField (always{' '}
            <code>type="text"</code> — never <code>type="number"</code>) with
            the numeric machinery around it. Typing is gated to valid numeric
            text; <strong>commits are eager</strong> — every keystroke that
            forms a complete number fires <code>onChange</code> with a valid
            (rounded, clamped) value, so a Save triggered from inside the field
            never reads stale state — and blur/Enter canonicalises the display
            (grouping, decimal padding, clamping). Each demo shows the
            parent-owned <code>value</code> live: watch it track keystrokes,
            arrow keys (Shift = ×10) and blur. Separators follow the app
            language (try French or Arabic).
          </>
        }
      >
        <div class={styles.grid}>
          <Field caption="Integer · groups on blur">
            <NumberField
              label="Quantity"
              value={qty()}
              onChange={setQty}
              helperText="Type 1234567, then blur — grouping appears"
            />
            <ValueReadout value={qty()} />
          </Field>
          <Field caption="2 dp · padded (currency-shaped)">
            <NumberField
              label="Cost price"
              value={cost()}
              onChange={setCost}
              decimalLimit={2}
              decimalMin={2}
              step={0.5}
              helperText="Blur pads to 2 dp — the Currency field's base"
            />
            <ValueReadout value={cost()} />
          </Field>
          <Field caption="Negative allowed · 1 dp">
            <NumberField
              label="Adjustment"
              value={adjustment()}
              onChange={setAdjustment}
              allowNegative
              decimalLimit={1}
              helperText="A lone '-' commits nothing until a digit lands"
            />
            <ValueReadout value={adjustment()} />
          </Field>
          <Field caption="Clamped 1–100 · step 5">
            <NumberField
              label="Pack size"
              value={packSize()}
              onChange={setPackSize}
              min={1}
              max={100}
              step={5}
              helperText="Type 500: the value clamps at once, the text on blur"
            />
            <ValueReadout value={packSize()} />
          </Field>
          <Field caption="noFormatting">
            <NumberField
              label="Year"
              value={year()}
              onChange={setYear}
              max={9999}
              noFormatting
              helperText="No grouping — still a number (leading 0s drop on blur); zero-keeping codes want TextField"
            />
            <ValueReadout value={year()} />
          </Field>
          <Field caption='Disabled · width="short" override'>
            <NumberField
              label="Total (computed)"
              value={1234567.891}
              onChange={() => {}}
              decimalLimit={2}
              disabled
              width="short"
              helperText="Grey fill — displays the formatted value. Numeric fields default to the compact width cap; wide totals opt up to 'short'."
            />
          </Field>
          <Field
            caption="Click Save straight from the field"
            class={styles.fullRow}
          >
            <div class={styles.saveRow}>
              <NumberField
                label="Counted packs"
                value={raceValue()}
                onChange={setRaceValue}
                helperText="Type and click Save without tabbing out"
              />
              <Button
                onClick={() => {
                  setSavedValue(raceValue());
                  setRaceSaves(n => n + 1);
                }}
              >
                Save
              </Button>
            </div>
            <output class={styles.valueReadout}>
              saved:{' '}
              <code>
                {savedValue() === undefined
                  ? 'undefined'
                  : JSON.stringify(savedValue())}
              </code>{' '}
              ({raceSaves()} save{raceSaves() === 1 ? '' : 's'}) — eager commits
              + synchronous signals mean Save never sees a stale value
            </output>
          </Field>
        </div>
      </Card>

      <Card
        title="Currency field — money over NumberField"
        lead={
          <>
            A NumberField whose decimal rules and symbol come from the currency,
            all derived from <code>Intl</code> — no hand-maintained table (the
            old OMS table had drifted: it gave KMF 2 decimals; ISO says 0). The
            symbol is field <em>chrome</em> (a TextField adornment), never part
            of the text, so the whole NumberField machinery is inherited — try
            pasting <code>$1,234.56</code>. With no <code>currency</code> prop
            the field follows the store's home currency — mocked by the selector
            below until the store wiring lands (TODO in{' '}
            <code>src/intl/currency.ts</code>). Symbol placement follows the app
            language: switch to French and the € moves after the number.
          </>
        }
      >
        <div class={styles.grid}>
          <Field caption="Mock store home currency" class={styles.fullRow}>
            <Select
              label="Store home currency"
              options={MOCK_STORE_CURRENCIES.map(code => ({
                value: code,
                label: `${code} — ${getCurrencyInfo(code, locale()).symbol}`,
              }))}
              value={homeCurrency()}
              onValueChange={setHomeCurrency}
            />
          </Field>
          <Field caption="Follows home currency">
            <CurrencyField
              label="Sell price"
              value={price()}
              onChange={setPrice}
              helperText="No currency prop — switches with the selector above"
            />
            <ValueReadout value={price()} />
          </Field>
          <Field caption='Explicit currency="EUR"'>
            <CurrencyField
              label="Supplier price"
              value={eurPrice()}
              onChange={setEurPrice}
              currency="EUR"
              helperText="Fixed foreign currency — in French, € trails"
            />
            <ValueReadout value={eurPrice()} />
          </Field>
          <Field caption="Zero-decimal currency (JPY)">
            <CurrencyField
              label="Cost"
              value={yenPrice()}
              onChange={setYenPrice}
              currency="JPY"
              helperText="0 minor units — the decimal point isn't typeable"
            />
            <ValueReadout value={yenPrice()} />
          </Field>
          <Field caption="decimalLimit={4} override">
            <CurrencyField
              label="Cost per unit"
              value={unitCost()}
              onChange={setUnitCost}
              decimalLimit={4}
              helperText="4 dp in any home currency — blur pads to its minor units"
            />
            <ValueReadout value={unitCost()} />
          </Field>
          <Field caption='currencyDisplay="code"'>
            <CurrencyField
              label="Amount (SBD)"
              value={sbdPrice()}
              onChange={setSbdPrice}
              currency="SBD"
              currencyDisplay="code"
              helperText='Where "$" would be ambiguous, show the ISO code'
            />
            <ValueReadout value={sbdPrice()} />
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
            <DateField
              label="Expiring before"
              hideLabel
              value={expiringBefore()}
              onChange={setExpiringBefore}
            />
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
        title="Date & time — headless (corvu)"
        lead={
          <>
            <code>DateField</code>, <code>DateRangeField</code>,{' '}
            <code>DateTimeField</code> and <code>TimeField</code>: a popover
            date picker on <strong>corvu</strong>'s headless calendar (our own
            markup + tokens, same bargain as Kobalte), so it renders{' '}
            <strong>identically in every browser</strong>. You can{' '}
            <strong>type the date</strong> (e.g. <code>23/04/2023</code>) or
            pick it; the calendar header opens{' '}
            <strong>month &amp; year grids</strong> (no giant native dropdown).
            The <code>format</code> prop drives both display and parsing (
            <code>dd/MM/yyyy</code>, <code>dd MMM yyyy</code>, …). Time is{' '}
            <strong>Kobalte's segmented TimeField</strong> (type or arrow-step,
            no invalid values), with an optional <code>hourCycle</code> for
            am/pm. <code>DateTimeField</code> puts the typed date and segmented
            time in <strong>one input</strong>, storing a{' '}
            <strong>UTC instant</strong> while the user edits{' '}
            <strong>local wall-clock</strong> time.
          </>
        }
      >
        <div class={styles.grid}>
          <Field caption="Date — type or pick">
            <DateField
              label="Expiry date"
              value={expiry()}
              onChange={setExpiry}
              helperText={`Type e.g. 12 Aug 2027, or pick. Stored: ${
                expiry() ?? '(empty)'
              }`}
            />
          </Field>
          <Field caption="Short format (dd/MM/yyyy)">
            <DateField
              label="Invoice date"
              format="dd/MM/yyyy"
              value={invoiceDate()}
              onChange={setInvoiceDate}
              helperText={`Type 23/04/2023. Stored: ${
                invoiceDate() ?? '(empty)'
              }`}
            />
          </Field>
          <Field caption="Bounded — future unselectable">
            <DateField
              label="Manufacture date"
              max={todayIso()}
              value={manufacture()}
              onChange={setManufacture}
              helperText={`max = today; later dates greyed out. Stored: ${
                manufacture() ?? '(empty)'
              }`}
            />
          </Field>
          <Field caption="Time — 12h am/pm (Kobalte)">
            <TimeField
              label="Cut-off time"
              value={cutoff()}
              onChange={setCutoff}
              hourCycle={12}
              helperText={`Stored (HH:mm): ${cutoff() ?? '(empty)'}`}
            />
          </Field>
          <Field caption="Date range">
            <DateRangeField
              label="Report period"
              value={period()}
              onChange={setPeriod}
              helperText={`${period().start ?? '…'} → ${period().end ?? '…'}`}
            />
          </Field>
          <Field caption="Required">
            <DateField
              label="Count date"
              required
              value={countDate()}
              onChange={setCountDate}
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
    </div>
  );
};
