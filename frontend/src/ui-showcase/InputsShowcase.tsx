import { createSignal, type JSX } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { TextField } from '../ui/elements/inputs/TextField';
import { PasswordField } from '../ui/elements/inputs/PasswordField';
import { TextArea } from '../ui/elements/inputs/TextArea';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { CurrencyField } from '../ui/elements/inputs/CurrencyField';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { RadioGroup } from '../ui/elements/inputs/RadioGroup';
import { Checkbox } from '../ui/elements/inputs/Checkbox';
import { BareCheckbox } from '../ui/elements/inputs/BareCheckbox';
import { ToggleSwitch } from '../ui/elements/inputs/ToggleSwitch';
import { DateField } from '../ui/elements/inputs/DateField';
import { DateTimeField } from '../ui/elements/inputs/DateTimeField';
import { localTodayIso } from '../ui/elements/inputs/dateTimeConvert';
import { TimeField } from '../ui/elements/inputs/TimeField';
import {
  DateRangeField,
  type IsoDateRange,
} from '../ui/elements/inputs/DateRangeField';
import { InfoTooltip } from '../ui/elements/feedback/InfoTooltip';
import { SaveButton } from '../ui/elements/buttons/StandardButtons';
import { Select } from '../ui/elements/selectors/Select';
import {
  getCurrencyInfo,
  homeCurrency,
  locale,
  setHomeCurrency,
} from '../intl';
import { FormPreview, Intro, Lead, Note, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
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

/*
 * Storybook of the input + form-layout elements: the TextField (company input
 * design spec), the TextArea (the same spec, multi-line), the RadioGroup
 * (native single-choice), the Checkbox (native plain checkbox), and FieldRow
 * (inline label + control) — the form-composition piece that pairs with them
 * inside a dialog/panel. InsetPanel, the recessed grouping container, is a
 * layout element (see the Layout › Inset panel section).
 */
export const inputsMetadata: PageMetadata = {
  id: 'inputs',
  title: 'Inputs',
  searchTerms: ['field', 'form', 'control'],
  items: [
    {
      id: 'inputs-text',
      title: 'Text fields',
      searchTerms: ['string', 'textfield', 'states', 'size'],
    },
    {
      id: 'inputs-label-info',
      title: 'Label help tooltip',
      searchTerms: ['labelInfo', 'tooltip', 'info', 'help', 'explanation'],
    },
    {
      id: 'inputs-multiline',
      title: 'Multi-line text',
      searchTerms: ['textarea', 'notes', 'comment', 'paragraph'],
    },
    {
      id: 'inputs-numbers',
      title: 'Number field',
      searchTerms: ['numeric', 'quantity', 'integer', 'decimal'],
    },
    {
      id: 'inputs-currency',
      title: 'Currency field',
      searchTerms: ['money', 'price', 'cost', 'amount'],
    },
    {
      id: 'inputs-date-time',
      title: 'Date & time',
      searchTerms: ['calendar', 'picker', 'datetime', 'range'],
    },
    {
      id: 'inputs-field-row',
      title: 'Field row',
      searchTerms: ['inline', 'label', 'row'],
    },
    {
      id: 'inputs-radio',
      title: 'Radio group',
      searchTerms: ['radio', 'option', 'single choice'],
    },
    {
      id: 'inputs-checkbox',
      title: 'Checkbox',
      searchTerms: ['checkbox', 'tick', 'boolean'],
    },
  ],
};

export const InputsShowcase = () => {
  // RadioGroup demo: a stocktake-type choice, plus an indented include-all
  // sub-choice — the exact shape the create-stocktake modal uses.
  const [stocktakeType, setStocktakeType] = createSignal('full');
  const [includeAll, setIncludeAll] = createSignal('soh');
  // Checkbox / ToggleSwitch demos.
  const [countZero, setCountZero] = createSignal(true);
  const [confirmed, setConfirmed] = createSignal(false);
  // BareCheckbox demo: interactive boxes for the selectable + error states
  // (the rest are state displays).
  const [bareSelected, setBareSelected] = createSignal(false);
  const [bareError, setBareError] = createSignal(false);
  const [showFinalised, setShowFinalised] = createSignal(false);
  const [onHold, setOnHold] = createSignal(true);
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
  const [password, setPassword] = createSignal('sekret-123');

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={inputsMetadata} />
        <Intro>
          To show a read-only value <em>alongside</em> these inputs — a fixed
          fact that reads as a field but has no input box — use{' '}
          <code>&lt;LabelledValue&gt;</code> with <code>variant="field"</code>,
          which matches the input label→control gap so the two line up. See{' '}
          <a href="#/showcase/display">Display › Labelled value</a>.
        </Intro>
        <DashboardCard id="inputs-text" title="Text field states">
          <Lead>
            The company-spec text input: a plain HTML <code>&lt;input&gt;</code>{' '}
            + CSS, no library — label, helper/error message, required marker,
            two heights and the short/long width caps. Every colour is a theme
            token (the red error glow is <code>--focus-ring-error</code>, themed
            for dark alongside <code>--focus-ring</code>). Click into a field
            for the blue focus ring; error and required are never conveyed by
            colour alone.
          </Lead>
          <div class={styles.grid}>
            <Field caption="Default">
              <TextField
                label="Item Code"
                placeholder="e.g. AMX500"
                helperText="Click to focus — blue ring appears"
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
        </DashboardCard>

        <DashboardCard
          id="inputs-label-info"
          title="Help tooltip on the label — labelInfo"
        >
          <Lead>
            Any field can hang an{' '}
            <a href="#/showcase/feedback">
              <code>&lt;InfoTooltip&gt;</code>
            </a>{' '}
            off its label through the <code>labelInfo</code> slot: a quiet ⓘ
            that opens a short gloss on hover, focus, or tap. It's the place for
            a <em>standing</em> explanation — why a field is disabled, what a
            number means — that would cost a permanent two- or three-line{' '}
            <code>helperText</code> paragraph under the control. Keep{' '}
            <code>helperText</code> for text that must always be read.
          </Lead>
          <div class={styles.grid}>
            <Field caption="Text field">
              <TextField
                label="Currency rate"
                value="1.6"
                labelInfo={
                  <InfoTooltip text="The number of local (home) currency units per one PO currency unit — a rate of 1.6 means 1 USD = 1.6 NZD." />
                }
              />
            </Field>
            <Field caption="Date field — explaining a disabled state">
              <DateField
                label="Received"
                value="2026-05-19"
                disabled
                labelInfo={
                  <InfoTooltip text="The received date can only be changed once the shipment is received, and only within the store's backdating window." />
                }
              />
            </Field>
          </div>
          <Note>
            <strong>Every labelled input and selector takes it</strong> — the
            text inputs and their wrappers, the multi-line field, all four
            date/time fields, Checkbox, ToggleSwitch, RadioGroup, and the{' '}
            <a href="#/showcase/selectors">selectors</a> — so the affordance
            reads the same wherever it appears. The icon always renders{' '}
            <em>outside</em> the label element, so it never becomes part of the
            control's accessible name (and on the self-labelling controls, a
            click on the icon doesn't toggle them). It's ignored under{' '}
            <code>hideLabel</code>, where there's no visible label to hang it
            off.
          </Note>
        </DashboardCard>

        <DashboardCard title="Password field">
          <Lead>
            A TextField variant — the standard masked{' '}
            <code>type="password"</code> input plus a show/hide eye toggle
            seated in the field frame. Click the eye to reveal the value, again
            to mask it; the toggle is keyboard-focusable.
          </Lead>
          <div class={styles.grid}>
            <Field caption="Default">
              <PasswordField
                label="Site password"
                value={password()}
                onInput={e => setPassword(e.currentTarget.value)}
                helperText="Click the eye to reveal"
              />
            </Field>
            <Field caption="Error">
              <PasswordField
                label="Site password"
                value="wrong"
                error="Incorrect password"
              />
            </Field>
            <Field caption="Disabled">
              <PasswordField label="Site password" value="locked" disabled />
            </Field>
          </div>
        </DashboardCard>

        <DashboardCard title="Size variations — default & small">
          <Lead>
            Two sizes (ui-standards "Text Fields — Size Variations"):{' '}
            <strong>default</strong> (2.5rem / 40px, 14px text) for standalone
            form fields, modals and drawers; <code>size="small"</code> (2.25rem
            / 36px, <strong>13px</strong> text <em>and</em> label) for dense
            contexts — table inline editing, filter bars, toolbars, sidebars.
            Small shrinks the height <em>and</em> the type. The one{' '}
            <code>size</code> prop flows to <code>NumberField</code>,{' '}
            <code>CurrencyField</code> and the date fields — compare each pair
            below.
          </Lead>
          <div class={styles.grid}>
            <Field caption="Default — 40px · 14px">
              <TextField label="Item Name" value="Amoxicillin 500mg" />
            </Field>
            <Field caption="Small — 36px · 13px">
              <TextField
                label="Item Name"
                size="small"
                value="Amoxicillin 500mg"
              />
            </Field>
            <Field caption="Default — number">
              <NumberField
                label="Pack size"
                value={packSize()}
                onChange={setPackSize}
              />
            </Field>
            <Field caption="Small — number">
              <NumberField
                label="Pack size"
                size="small"
                value={packSize()}
                onChange={setPackSize}
              />
            </Field>
            <Field caption="Default — date">
              <DateField label="Expiry" value={expiry()} onChange={setExpiry} />
            </Field>
            <Field caption="Small — date">
              <DateField
                label="Expiry"
                size="small"
                value={expiry()}
                onChange={setExpiry}
              />
            </Field>
          </div>
          <Note>
            <strong>Touch enforcement:</strong> on coarse pointers (phones,
            tablets) every input grows to a WCAG 2.5.5 (AAA) tap target —{' '}
            <strong>default → 48px</strong>, <strong>small → 44px</strong> — and
            the text bumps to 16px so iOS Safari doesn&rsquo;t zoom on focus.
            Both heights are absolute px, so the narrow-viewport root shrink
            can&rsquo;t erode them. Every field reads the same four{' '}
            <code>--input-height*</code> tokens, so they stay aligned side by
            side. Emulate a touch device (or resize on a real one) to see it.
          </Note>
        </DashboardCard>

        <DashboardCard
          id="inputs-multiline"
          title="Multi-line text — native <textarea>"
        >
          <Lead>
            The TextField spec on a plain HTML <code>&lt;textarea&gt;</code> —
            same border, focus ring, label and helper/error wiring. The{' '}
            <code>rows</code> prop sets the visible lines (default 4, as the old
            OMS TextArea); the height is fixed — longer content scrolls, no
            resize grip. Defaults to full width (<code>width</code> caps it, as
            TextField).
          </Lead>
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
        </DashboardCard>

        <DashboardCard
          id="inputs-numbers"
          title="Number field — numeric input over TextField"
        >
          <Lead>
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
          </Lead>
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
                <SaveButton
                  onClick={() => {
                    setSavedValue(raceValue());
                    setRaceSaves(n => n + 1);
                  }}
                />
              </div>
              <output class={styles.valueReadout}>
                saved:{' '}
                <code>
                  {savedValue() === undefined
                    ? 'undefined'
                    : JSON.stringify(savedValue())}
                </code>{' '}
                ({raceSaves()} save{raceSaves() === 1 ? '' : 's'}) — eager
                commits + synchronous signals mean Save never sees a stale value
              </output>
            </Field>
          </div>
        </DashboardCard>

        <DashboardCard
          id="inputs-currency"
          title="Currency field — money over NumberField"
        >
          <Lead>
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
          </Lead>
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
        </DashboardCard>

        <DashboardCard
          id="inputs-date-time"
          title="Date & time — headless (corvu)"
        >
          <Lead>
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
          </Lead>
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
                max={localTodayIso()}
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
        </DashboardCard>

        <DashboardCard
          id="inputs-field-row"
          title="Field row — inline label + control"
        >
          <Lead>
            A compact form row: a bold label on the inline-start, the control
            filling the inline-end — the app's dense dialog/panel layout (the
            create-stocktake filter rows). Hand-rolled layout only; the wrapped
            control keeps its own look but hides its own label (via{' '}
            <code>hideLabel</code>) so this row is the single visible label,
            announced to assistive tech. RTL-safe (logical properties).
          </Lead>
          <FormPreview>
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
          </FormPreview>
        </DashboardCard>

        <DashboardCard
          id="inputs-radio"
          title="Radio group — native <input type=radio>"
        >
          <Lead>
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
          </Lead>
          <Lead>
            <code>appearance="card"</code> is the same group drawn as selectable
            boxes: the whole box is the target, the label goes bold with its{' '}
            <code>description</code> running <em>inline</em> after it, and the
            chosen one takes a brand rim and a wash of the same colour — so the
            active choice reads from across a dialog, not from one 18px dot. Use
            it for a short set of <strong>modes that reshape the screen</strong>{' '}
            (the three below decide what the create-stocktake modal shows under
            them); a plain yes/no like <em>Which items</em> stays a bare list.
            The selected state comes from <code>:has(input:checked)</code> — no
            JS mirrors it, so the box and the dot cannot disagree.
          </Lead>
          <FormPreview>
            <RadioGroup
              label='Stocktake type (appearance="card")'
              appearance="card"
              value={stocktakeType()}
              onChange={setStocktakeType}
              options={[
                {
                  value: 'full',
                  label: 'Full stocktake',
                  description: 'Count every item in your store.',
                },
                {
                  value: 'filtered',
                  label: 'Filtered stocktake',
                  description:
                    'Narrow down which items are included using the filters below.',
                },
                {
                  value: 'blank',
                  label: 'Blank stocktake',
                  description: 'Start empty and add items manually.',
                },
              ]}
            />
            <RadioGroup
              label="Stocktake type (default appearance)"
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
                  // Disabled to show the per-option disabled state (as the
                  // modal greys "All items").
                  {
                    value: 'all',
                    label: 'All items',
                    disabled: stocktakeType() === 'blank',
                  },
                ]}
              />
            </div>
          </FormPreview>
        </DashboardCard>

        <DashboardCard
          id="inputs-checkbox"
          title="Checkbox — native <input type=checkbox>"
        >
          <Lead>
            A labelled checkbox on the native control — no library. The real
            input is visually hidden (kept for a11y + as the state owner); a
            styled box + check glyph read the <code>:checked</code> /{' '}
            <code>:focus-visible</code> state off it. The label click toggles
            it; an <code>error</code> shows an icon + message (never colour
            alone). Label typography matches TextField.
          </Lead>
          <FormPreview>
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
          </FormPreview>
        </DashboardCard>

        <DashboardCard title="Bare checkbox — the box, no label">
          <Lead>
            The primitive <code>Checkbox</code> wraps: THE box every checkbox in
            the app renders — one look by construction, the native{' '}
            <code>&lt;input type=checkbox&gt;</code> as the state owner. It
            renders <strong>no label</strong>, so it's used bare where something
            else names it — a table's selection cells, given an{' '}
            <code>aria-label</code> (the row already identifies it). It adds{' '}
            <code>indeterminate</code> (the tri-state select-all dash) and an{' '}
            <code>error</code> look; when you need a visible label, reach for{' '}
            <code>Checkbox</code> above.
          </Lead>
          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '2.5rem' }}>
            <Field caption="Selectable">
              <BareCheckbox
                aria-label="Select row"
                checked={bareSelected()}
                onChange={e => setBareSelected(e.currentTarget.checked)}
              />
            </Field>
            <Field caption="Indeterminate">
              <BareCheckbox aria-label="Select all rows" indeterminate />
            </Field>
            <Field caption="Error">
              <BareCheckbox
                aria-label="Required selection"
                error
                checked={bareError()}
                onChange={e => setBareError(e.currentTarget.checked)}
              />
            </Field>
            <Field caption="Disabled">
              <BareCheckbox aria-label="Locked selection" disabled />
            </Field>
            <Field caption="Disabled (checked)">
              <BareCheckbox aria-label="Locked selection" disabled checked />
            </Field>
          </div>
        </DashboardCard>

        <DashboardCard title="Toggle switch — on/off toggle (role=switch)">
          <Lead>
            The native checkbox re-cast as a switch (<code>role="switch"</code>
            ): a custom track + sliding thumb, the state carried by the thumb
            position. Space toggles it; the label click toggles it. For a binary
            on/off setting where a slider reads more naturally than a tick box.
            The <code>on</code> state is the action blue by default;{' '}
            <code>variant="caution"</code> makes it brand orange for a setting
            to be careful with (e.g. putting stock on hold).
          </Lead>
          <FormPreview>
            <ToggleSwitch
              label="Show finalised stocktakes"
              checked={showFinalised()}
              onChange={setShowFinalised}
            />
            <ToggleSwitch
              label="On hold"
              variant="caution"
              checked={onHold()}
              onChange={setOnHold}
            />
            <ToggleSwitch label="Disabled switch" disabled checked />
          </FormPreview>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
