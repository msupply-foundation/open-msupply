import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  Switch,
} from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Button } from '../../ui/elements/buttons/Button';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { Select } from '../../ui/elements/selectors/Select';
import { RadioGroup } from '../../ui/elements/inputs/RadioGroup';
import { DateField } from '../../ui/elements/inputs/DateField';
import { DateRangeField } from '../../ui/elements/inputs/DateRangeField';
import { MasterListSelect } from '../masterList/MasterListSelect';
import { LocationSelect } from '../location/LocationSelect';
import { storeContext } from '../../store/storeContext';
import {
  cleanArguments,
  parseArgumentSchema,
  seedDefaults,
  type ParsedField,
  type ReportArgs,
} from './schema';

/**
 * The slice of a report node the form reads — the schema pair. Structural, so
 * any generated ReportNode satisfies it without remapping (kdd/type-safety).
 */
export interface ArgumentSchemaSource {
  argumentSchema?: { jsonSchema: unknown; uiSchema: unknown } | null;
}

// The kinds whose empty-while-required state gates OK (AC-R7). Unsupported
// controls are deliberately absent: a required field the client can't render
// never blocks — the server's typed data-fetch failure reports the miss.
type RequirableField = Extract<
  ParsedField,
  { kind: 'text' | 'number' | 'enum' | 'date' }
>;
const isRequirable = (field: ParsedField): field is RequirableField =>
  field.kind === 'text' ||
  field.kind === 'number' ||
  field.kind === 'enum' ||
  field.kind === 'date';

// S3 — the argument-entry modal (spec/reports S3, AC-R1–R8). The filter form
// is rendered FROM the report's argument schema: field set, order, labels, and
// control choice come from the server's schema, not per-report client code
// (spec "Arguments"). Because that is render-from-config by wire contract, the
// explicit-composition anti-default (kdd/explicit-composition) can't apply in
// its usual form — so this is the bounded interpreter recorded in
// kdd/report-argument-forms: ONE parse module (schema.ts) + ONE switch below,
// each branch an explicit library component. The schema vocabulary is closed
// and server-owned; a new control type is one new <Match> branch, and anything
// unknown degrades to a disabled, labelled placeholder rather than crashing.
//
// Props contract (kept exactly — S2 owns navigation): onSubmit returns the
// entered arguments; the consumer writes them into the URL query, which drives
// generation. Cancel closes without generating.
export interface ArgumentsModalProps {
  report: ArgumentSchemaSource;
  open: boolean;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (args: Record<string, unknown>) => void;
}

export const ArgumentsModal = (props: ArgumentsModalProps) => {
  // The parsed field list — recomputes only when the report's schema changes,
  // so the <For> below is stable across a form session (no row remounts on
  // interaction, kdd/solid-reactivity-pitfalls).
  const fields = createMemo<ParsedField[]>(() =>
    props.report.argumentSchema
      ? parseArgumentSchema(props.report.argumentSchema)
      : []
  );

  // Local form state as a store, updated field-by-field in place. Seeded fresh
  // each time the modal opens (an interaction never reseeds): from the URL
  // arguments when reopening pre-filled, otherwise from store preferences +
  // schema defaults (AC-R3). reconcile replaces the contents while keeping the
  // store's identity, so bindings that still apply don't tear down.
  const [values, setValues] = createStore<ReportArgs>({});
  // Required-field errors only show after an OK attempt (AC-R7) — the form's
  // helper text promises the details are optional, so nothing nags earlier.
  const [attempted, setAttempted] = createSignal(false);
  createEffect(
    on(
      () => props.open,
      open => {
        if (!open) return;
        setAttempted(false);
        const prefs = storeContext()?.storePreferences ?? {};
        const seed = props.initialValues ?? seedDefaults(fields(), prefs);
        setValues(reconcile({ ...seed }));
      }
    )
  );

  // Controlled-value accessors — read the store inside JSX, so they stay
  // reactive and each store write re-runs only its own binding.
  const textValue = (key: string): string => {
    const value = values[key];
    return typeof value === 'string' ? value : '';
  };
  // Display-invert: for an inverted boolean the checkbox shows the negation of
  // the stored raw value (schema key `isActive` shown as "Include inactive"),
  // and writes the negation back — the stored argument stays the raw schema
  // key.
  const boolChecked = (
    field: Extract<ParsedField, { kind: 'boolean' }>
  ): boolean => {
    const raw = values[field.key] === true;
    return field.invert ? !raw : raw;
  };
  const setBool = (
    field: Extract<ParsedField, { kind: 'boolean' }>,
    checked: boolean
  ): void => setValues(field.key, field.invert ? !checked : checked);
  const selectValue = (key: string): string | undefined => {
    const value = values[key];
    return typeof value === 'string' ? value : undefined;
  };
  const rangeValue = (key: string): { start: string; end: string } => {
    const value = values[key];
    const range =
      value && typeof value === 'object'
        ? (value as { start?: unknown; end?: unknown })
        : {};
    return {
      start: typeof range.start === 'string' ? range.start : '',
      end: typeof range.end === 'string' ? range.end : '',
    };
  };
  // NumberField owns the edit text; the store holds the committed number (or
  // undefined = empty). A URL-restored value is already a JSON number.
  const numberValue = (key: string): number | undefined => {
    const value = values[key];
    return typeof value === 'number' ? value : undefined;
  };

  const isEmpty = (key: string): boolean => {
    const value = values[key];
    return value === undefined || value === null || value === '';
  };
  const requiredError = (field: RequirableField): string | undefined =>
    attempted() && field.required && isEmpty(field.key)
      ? t('error.field-required')
      : undefined;

  // OK: block while a rendered required field is empty (AC-R7 — the inline
  // error appears at the field), then emit the cleaned values: empties
  // stripped (absent ≠ "" server-side), numbers as numbers (AC-R8). unwrap()
  // drops the store proxy first.
  const submit = (): void => {
    const missing = fields().some(
      field => isRequirable(field) && field.required && isEmpty(field.key)
    );
    if (missing) {
      setAttempted(true);
      return;
    }
    props.onSubmit(cleanArguments(fields(), unwrap(values)));
  };

  return (
    <Dialog
      open={props.open}
      onClose={() => props.onClose()}
      title={t('label.report-filters')}
      description={t('message.arguments')}
      widthRem={30}
      actions={
        <>
          <Button variant="secondary" onClick={() => props.onClose()}>
            {t('button.cancel')}
          </Button>
          <Button onClick={submit}>{t('button.ok')}</Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: 'var(--space-4)',
        }}
      >
        <For each={fields()}>
          {field => (
            <Switch>
              <Match when={field.kind === 'text' ? field : undefined} keyed>
                {textField => (
                  <TextField
                    label={textField.label}
                    width="full"
                    value={textValue(textField.key)}
                    disabled={textField.readOnly}
                    required={textField.required}
                    error={requiredError(textField)}
                    onInput={event =>
                      setValues(textField.key, event.currentTarget.value)
                    }
                  />
                )}
              </Match>
              <Match when={field.kind === 'number' ? field : undefined} keyed>
                {numberField => (
                  /* Constrained numeric entry (AC-R4): NumberField gates
                     keystrokes and raises the decimal keypad. The schema
                     declares no precision; two decimal places covers the
                     fractional-months cases without float noise. */
                  <NumberField
                    label={numberField.label}
                    width="full"
                    decimalLimit={2}
                    value={numberValue(numberField.key)}
                    disabled={numberField.readOnly}
                    required={numberField.required}
                    error={requiredError(numberField)}
                    onChange={value => setValues(numberField.key, value)}
                  />
                )}
              </Match>
              <Match when={field.kind === 'date' ? field : undefined} keyed>
                {dateField => (
                  <DateField
                    label={dateField.label}
                    value={textValue(dateField.key)}
                    disabled={dateField.readOnly}
                    required={dateField.required}
                    error={requiredError(dateField)}
                    onChange={value => setValues(dateField.key, value ?? '')}
                  />
                )}
              </Match>
              <Match when={field.kind === 'boolean' ? field : undefined} keyed>
                {boolField => (
                  <Checkbox
                    label={boolField.label}
                    checked={boolChecked(boolField)}
                    disabled={boolField.readOnly}
                    onChange={checked => setBool(boolField, checked)}
                  />
                )}
              </Match>
              <Match when={field.kind === 'enum' ? field : undefined} keyed>
                {enumField => (
                  <Select
                    label={enumField.label}
                    options={enumField.options}
                    value={selectValue(enumField.key)}
                    disabled={enumField.readOnly}
                    // Select has no error slot; the required miss still gates
                    // OK (AC-R7) and this text says why. No shipped schema
                    // marks an enum required today.
                    helperText={requiredError(enumField)}
                    onValueChange={value => setValues(enumField.key, value)}
                  />
                )}
              </Match>
              <Match when={field.kind === 'sortToggle'}>
                <RadioGroup
                  label={field.label}
                  orientation="horizontal"
                  options={[
                    { value: 'asc', label: t('report.ascending') },
                    { value: 'desc', label: t('report.descending') },
                  ]}
                  value={selectValue(field.key)}
                  onChange={value => setValues(field.key, value)}
                />
              </Match>
              <Match when={field.kind === 'dateRange'}>
                {/*
                 * DateRange arg shape: the real DateRange control's argument
                 * shape couldn't be probed (the reports using it are dispensary
                 * ones absent from the probe environment). The uiSchema scope
                 * gives ONE property key, so we store the pair as a nested
                 * object under it — { <key>: { start, end } } — and send undefined
                 * (stripped) when both ends are empty. Revisit if a probed
                 * DateRange report shows a two-key shape.
                 */}
                <DateRangeField
                  label={field.label}
                  value={rangeValue(field.key)}
                  onChange={range => {
                    const start = range.start ?? '';
                    const end = range.end ?? '';
                    setValues(
                      field.key,
                      start || end ? { start, end } : undefined
                    );
                  }}
                />
              </Match>
              <Match when={field.kind === 'masterList'}>
                <MasterListSelect
                  label={field.label}
                  value={selectValue(field.key)}
                  onChange={id => setValues(field.key, id ?? undefined)}
                />
              </Match>
              <Match when={field.kind === 'location'}>
                <LocationSelect
                  label={field.label}
                  value={selectValue(field.key)}
                  onChange={location =>
                    setValues(field.key, location?.id ?? undefined)
                  }
                />
              </Match>
              <Match when={field.kind === 'unsupported'}>
                {/* Degradation path: the schema demands a control we don't
                    render yet (a backlog picker role, spec S3). Show it disabled
                    with its label so the form still lists the filter. */}
                <TextField
                  label={field.label}
                  width="full"
                  disabled
                  value=""
                  helperText={t('message.filter-not-supported')}
                />
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </Dialog>
  );
};
