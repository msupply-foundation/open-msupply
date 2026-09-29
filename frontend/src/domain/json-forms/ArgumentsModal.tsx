import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  on,
  Switch,
} from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { gated } from '../../api/gated';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Button } from '../../ui/elements/buttons/Button';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { Select } from '../../ui/elements/selectors/Select';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { RadioGroup } from '../../ui/elements/inputs/RadioGroup';
import { DateField } from '../../ui/elements/inputs/DateField';
import { DateTimeField } from '../../ui/elements/inputs/DateTimeField';
import { DateRangeField } from '../../ui/elements/inputs/DateRangeField';
import { MasterListSelect } from '../masterList/MasterListSelect';
import { LocationSelect } from '../location/LocationSelect';
import { fetchLocations, type Location } from '../location/locationResource';
import { ProgramDocumentSelect } from '../program/ProgramDocumentSelect';
import {
  ProgramListSelect,
  type ProgramListPick,
} from '../program/ProgramListSelect';
import { PeriodSelect } from '../program/PeriodSelect';
import {
  fetchPeriods,
  fetchPrograms,
  type PeriodItem,
  type ProgramListItem,
} from '../program/programResource';
import { NameSearch } from '../name/NameSearch';
import { fetchNameById, type NameOption } from '../name/nameResource';
import { ItemSearch } from '../item/ItemSearch';
import { fetchItemById, type ItemOption } from '../item/itemResource';
import {
  reasonOptionsResource,
  type ReasonOption,
} from '../reasonOptions/reasonOptionsResource';
import { ScheduleFormFields } from './ScheduleFormFields';
import { storeContext, currentStoreId } from '../../store/storeContext';
import { localTodayIso } from '../../ui/elements/inputs/dateTimeConvert';
import {
  cleanArguments,
  dateArgumentDay,
  dateArgumentValue,
  dateFieldBounds,
  dateFieldViolation,
  dayStartInstant,
  parseArgumentSchema,
  periodSearchWrites,
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

// The kinds whose empty-while-required state gates OK (OMS-REG-RPT-10.13).
// Unsupported controls are deliberately absent: a required field the client
// can't render never blocks — the server's typed data-fetch failure reports the
// miss.
type RequirableField = Extract<
  ParsedField,
  {
    kind:
      | 'text'
      | 'number'
      | 'enum'
      | 'date'
      | 'program'
      | 'programSearch'
      | 'nameSearch'
      | 'itemSearch'
      | 'reasonOption'
      | 'periodSearch';
  }
>;
const isRequirable = (field: ParsedField): field is RequirableField =>
  field.kind === 'text' ||
  field.kind === 'number' ||
  field.kind === 'enum' ||
  field.kind === 'date' ||
  field.kind === 'program' ||
  field.kind === 'programSearch' ||
  field.kind === 'nameSearch' ||
  field.kind === 'itemSearch' ||
  field.kind === 'reasonOption' ||
  field.kind === 'periodSearch';

// The period argument field (OMS-REG-RPT-10.31): owns its own periods fetch —
// narrowed by the form's root `programId` when the schema says findByProgram
// (waiting disabled until one exists, clearing the pick when it changes) — and
// the selection restore for both write modes: an id-mode value IS the period
// id; a span-mode value is the start instant, matched back to a period.
const PeriodArgumentField = (props: {
  field: Extract<ParsedField, { kind: 'periodSearch' }>;
  storeId: string | undefined;
  /** The form's resolved sibling programId (undefined until picked). */
  programId: string | undefined;
  /** The raw stored value at the scoped key. */
  value: unknown;
  error?: string;
  onPick: (period: PeriodItem | null) => void;
}) => {
  const [periodsData] = createResource(
    () => {
      if (!props.storeId) return undefined;
      if (props.field.findByProgram && !props.programId) return undefined;
      return JSON.stringify({
        storeId: props.storeId,
        programId: props.field.findByProgram ? props.programId : null,
      });
    },
    async serialised => {
      const vars = JSON.parse(serialised) as {
        storeId: string;
        programId: string | null;
      };
      return fetchPeriods(vars.storeId, vars.programId ?? undefined);
    }
  );
  const periods = (): PeriodItem[] => gated(periodsData) ?? [];

  const selectedId = (): string | undefined => {
    const value = props.value;
    if (typeof value !== 'string' || value === '') return undefined;
    if (props.field.key === 'periodId') return value;
    return periods().find(p => dayStartInstant(p.startDate) === value)?.id;
  };

  // The find-by-program cascade: any change to the program pick (including a
  // clear) drops the period selection (OMS-REG-RPT-10.31). Deferred so the
  // initial mount/restore never wipes URL-restored values.
  createEffect(
    on(
      () => props.programId,
      () => {
        if (props.field.findByProgram) props.onPick(null);
      },
      { defer: true }
    )
  );

  const waiting = (): boolean => props.field.findByProgram && !props.programId;

  return (
    <PeriodSelect
      label={props.field.label}
      periods={periods()}
      loading={periodsData.loading}
      value={selectedId()}
      disabled={waiting()}
      // A disabled field says why (ui-standards inputs › fields): the
      // placeholder names the prerequisite pick (OMS-REG-RPT-10.31).
      placeholder={waiting() ? t('message.select-program-first') : undefined}
      error={props.error}
      onChange={props.onPick}
    />
  );
};

// S3 — the argument-entry modal (spec/reports S3, OMS-REG-RPT-10.1–.16). The
// filter form is rendered FROM the report's argument schema: field set, order,
// labels, and control choice come from the server's schema, not per-report
// client code (spec "Arguments"). Because that is render-from-config by wire
// contract, the explicit-composition anti-default (kdd/explicit-composition)
// can't apply in its usual form — so this is the bounded interpreter recorded
// in kdd/report-argument-forms: ONE parse module (schema.ts) + ONE switch
// below, each branch an explicit library component. The schema vocabulary is
// closed and server-owned; a new control type is one new <Match> branch, and
// anything unknown degrades to a disabled, labelled placeholder rather than
// crashing.
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

  // Locations for a `location`-kind argument, fetched locally (no global cache
  // — the location domain owns none anymore). Volume-blind: a report filter
  // only references a location. Non-suspending read so a pending fetch never
  // trips an ancestor <Suspense>.
  const [locationsData] = createResource(currentStoreId, storeId =>
    fetchLocations(storeId)
  );
  const locations = (): Location[] => gated(locationsData) ?? [];

  // Programs for a `programSearch`-kind argument (OMS-REG-RPT-10.22), fetched
  // locally in the same style; an immunisation-only field filters this one
  // fetch.
  const [programsData] = createResource(currentStoreId, fetchPrograms);
  const programs = (): ProgramListItem[] => gated(programsData) ?? [];

  // The program picker's three-key write (OMS-REG-RPT-10.22, contract
  // "Arguments"): the scoped key gets the program id, and the hard-coded
  // companions `elmisCode` and `fetchAllPrograms` are written alongside — the
  // sibling keys shipped data queries read. "All programs" leaves id and
  // elmisCode absent.
  const setProgramSearch = (key: string, pick: ProgramListPick): void => {
    if (pick === 'all') {
      setValues(key, undefined);
      setValues('elmisCode', undefined);
      setValues('fetchAllPrograms', true);
    } else {
      setValues(key, pick?.id);
      setValues('elmisCode', pick?.elmisCode ?? undefined);
      setValues('fetchAllPrograms', false);
    }
  };

  // Apply a multi-key write map from the pure helpers (periodSearchWrites /
  // scheduleCascadeWrites) — undefined removes the key from the store.
  const applyWrites = (writes: ReportArgs): void => {
    for (const [key, value] of Object.entries(writes))
      setValues(key, value as never);
  };

  // The adjustment-reason options (OMS-REG-RPT-10.30): the global active list
  // narrowed to the two inventory-adjustment types — wastage/return reasons
  // excluded (contract "Arguments").
  const adjustmentReasons = (): ReasonOption[] =>
    reasonOptionsResource
      .noSuspense()
      .filter(
        reason =>
          reason.type === 'POSITIVE_INVENTORY_ADJUSTMENT' ||
          reason.type === 'NEGATIVE_INVENTORY_ADJUSTMENT'
      );

  // The async pickers (name/item) are controlled by OBJECT, but the argument
  // store holds only the id — these maps carry each field's picked object for
  // label display. Reopening pre-filled (URL args) resolves labels with a
  // by-id fetch; a failed resolve just leaves the picker showing empty while
  // the id still submits.
  const [pickedNames, setPickedNames] = createStore<
    Record<string, NameOption | undefined>
  >({});
  const [pickedItems, setPickedItems] = createStore<
    Record<string, ItemOption | undefined>
  >({});

  // Local form state as a store, updated field-by-field in place. Seeded fresh
  // each time the modal opens (an interaction never reseeds): from the URL
  // arguments when reopening pre-filled, otherwise from store preferences +
  // schema defaults (OMS-REG-RPT-10.5). reconcile replaces the contents while
  // keeping the store's identity, so bindings that still apply don't tear down.
  const [values, setValues] = createStore<ReportArgs>({});
  // Required-field errors only show after an OK attempt (OMS-REG-RPT-10.13) —
  // the form's helper text promises the details are optional, so nothing nags
  // earlier.
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
        // Label restore for the async pickers: a reopened form holds only ids
        // — resolve each to its object so the picker shows the selection.
        setPickedNames(reconcile({}));
        setPickedItems(reconcile({}));
        const storeId = currentStoreId();
        if (!storeId) return;
        for (const field of fields()) {
          const value = seed[field.key];
          if (typeof value !== 'string' || value === '') continue;
          if (field.kind === 'nameSearch') {
            void fetchNameById(storeId, value).then(name => {
              if (name) setPickedNames(field.key, name);
            });
          } else if (field.kind === 'itemSearch') {
            void fetchItemById(storeId, value).then(item => {
              if (item) setPickedItems(field.key, item);
            });
          }
        }
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
  // The period picker's find-by-program sibling: the form's own root
  // `programId` value — the captured client's All-programs sentinel counts as
  // no program (contract "Arguments").
  const programIdArg = (): string | undefined => {
    const value = selectValue('programId');
    return value && value !== 'AllProgramsSelector' ? value : undefined;
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

  // A date field's bound violation (OMS-REG-RPT-10.40), as its inline message.
  // Unlike the required nag this shows immediately — it marks an actively wrong
  // typed entry (the picker can't produce one) — and it gates OK (see submit).
  const dateError = (
    field: Extract<ParsedField, { kind: 'date' }>
  ): string | undefined => {
    switch (dateFieldViolation(field, values, localTodayIso())) {
      case 'future':
        return t('error.date_disableFuture');
      case 'min':
        return t('error.date_minDate');
      case 'max':
        return t('error.date_maxDate');
      default:
        return undefined;
    }
  };

  // OK: block while a rendered required field is empty (OMS-REG-RPT-10.13 —
  // the inline error appears at the field), then emit the cleaned values:
  // empties stripped (absent ≠ "" server-side), numbers as numbers
  // (OMS-REG-RPT-10.15). unwrap() drops the store proxy first.
  const submit = (): void => {
    // The schedule cascade renders the fields for its five flat keys, so the
    // schema's required list gates them too (OMS-REG-RPT-10.35 /
    // OMS-REG-RPT-10.13) — without this, an empty submit reaches the report's
    // SQL as missing parameters.
    const missing = fields().some(field =>
      isRequirable(field)
        ? field.required && isEmpty(field.key)
        : field.kind === 'scheduleForm' &&
          field.requiredKeys.some(key => isEmpty(key))
    );
    // A date outside its bounds also blocks (OMS-REG-RPT-10.40) — only typed
    // entry can produce one, and its message is already showing at the field.
    const outOfBounds = fields().some(
      field =>
        field.kind === 'date' &&
        dateFieldViolation(field, values, localTodayIso()) !== undefined
    );
    if (missing || outOfBounds) {
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
          <Button
            variant="secondary"
            confirms="cancel"
            onClick={() => props.onClose()}
          >
            {t('button.cancel')}
          </Button>
          <Button confirms="plain" onClick={submit}>
            {t('button.ok')}
          </Button>
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
                  /* 
                   * Constrained numeric entry (OMS-REG-RPT-10.6): NumberField
                   * gates keystrokes and raises the decimal keypad. The schema
                   * declares no precision; two decimal places covers the
                   * fractional-months cases without float noise.
                   */
                  <NumberField
                    label={numberField.label}
                    decimalLimit={2}
                    value={numberValue(numberField.key)}
                    disabled={numberField.readOnly}
                    required={numberField.required}
                    error={requiredError(numberField)}
                    onChange={value => setValues(numberField.key, value)}
                  />
                )}
              </Match>
              <Match
                when={
                  field.kind === 'date' && (!field.dateTime || field.dateOnly)
                    ? field
                    : undefined
                }
                keyed
              >
                {/* Calendar-day entry: plain `format: 'date'` fields, and
                    date-time fields whose element asks for date-only entry
                    (OMS-REG-RPT-10.40) — those still store an instant (the picked day
                    widened, dateArgumentValue), so a bare date never reaches
                    the data query's DateTime variables. Bounds resolve live
                    from the sibling values (min/max scope refs + no-future). */}
                {dateField => (
                  <DateField
                    label={dateField.label}
                    value={dateArgumentDay(values[dateField.key])}
                    min={
                      dateFieldBounds(dateField, values, localTodayIso()).min
                    }
                    max={
                      dateFieldBounds(dateField, values, localTodayIso()).max
                    }
                    disabled={dateField.readOnly}
                    required={dateField.required}
                    error={requiredError(dateField) ?? dateError(dateField)}
                    onChange={value =>
                      setValues(
                        dateField.key,
                        value ? dateArgumentValue(dateField, value) : ''
                      )
                    }
                  />
                )}
              </Match>
              <Match
                when={
                  field.kind === 'date' && field.dateTime && !field.dateOnly
                    ? field
                    : undefined
                }
                keyed
              >
                {/* format: 'date-time' — the value is a UTC RFC3339 instant
                    (OMS-REG-RPT-10.8): the field owns the local-wall-clock⇄UTC boundary,
                    and the instant passes to the data query's DateTime
                    variables verbatim (a bare calendar date would fail their
                    parsing — spec/reports rules "Arguments"). */}
                {dateTimeField => (
                  <DateTimeField
                    label={dateTimeField.label}
                    value={textValue(dateTimeField.key) || null}
                    disabled={dateTimeField.readOnly}
                    required={dateTimeField.required}
                    error={
                      requiredError(dateTimeField) ?? dateError(dateTimeField)
                    }
                    onChange={value =>
                      setValues(dateTimeField.key, value ?? '')
                    }
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
                    // OK (OMS-REG-RPT-10.13) and this text says why. No
                    // shipped schema marks an enum required today.
                    helperText={requiredError(enumField)}
                    // A picked choice must be emptiable again unless required
                    // (OMS-REG-RPT-10.42); the cleared key is omitted on
                    // submit (OMS-REG-RPT-10.15). A read-only field
                    // (OMS-REG-RPT-10.11: shown disabled, seeded value still
                    // submitted) gets no clear affordance — it could never be
                    // used.
                    clearable={!enumField.required && !enumField.readOnly}
                    onClear={() => setValues(enumField.key, undefined)}
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
                 * DateRange arg shape (confirmed live against Pending
                 * Encounters): the uiSchema scope gives ONE property key, whose
                 * value is a nested object. We hold the editing pair as
                 * { <key>: { start, end } } (calendar dates) and store undefined
                 * when both ends are empty; cleanArguments() widens it to the
                 * wire `DatetimeFilterInput` — { afterOrEqualTo, beforeOrEqualTo }
                 * — on submit (see schema.ts `toDatetimeFilter`).
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
              <Match when={field.kind === 'program' ? field : undefined} keyed>
                {programField => (
                  <ProgramDocumentSelect
                    label={programField.label}
                    value={selectValue(programField.key)}
                    onChange={(contextId: string | null) =>
                      setValues(programField.key, contextId ?? undefined)
                    }
                    error={requiredError(programField)}
                  />
                )}
              </Match>
              <Match
                when={field.kind === 'programSearch' ? field : undefined}
                keyed
              >
                {psField => (
                  <ProgramListSelect
                    label={psField.label}
                    programs={
                      psField.immunisationOnly
                        ? programs().filter(p => p.isImmunisation)
                        : programs()
                    }
                    loading={programsData.loading}
                    allProgramsOption={psField.allPrograms}
                    value={selectValue(psField.key)}
                    error={requiredError(psField)}
                    onChange={pick => setProgramSearch(psField.key, pick)}
                  />
                )}
              </Match>
              <Match
                when={field.kind === 'nameSearch' ? field : undefined}
                keyed
              >
                {nameField => (
                  /* 
                   * OMS-REG-RPT-10.25: the party picker writes the scoped key
                   * = the name's id, nothing else; the picked object lives in
                   * pickedNames for label display only.
                   */
                  <NameSearch
                    label={nameField.label}
                    storeId={currentStoreId() ?? ''}
                    role={nameField.role}
                    selected={pickedNames[nameField.key]}
                    error={requiredError(nameField)}
                    onSelect={name => {
                      setPickedNames(nameField.key, name ?? undefined);
                      setValues(nameField.key, name?.id ?? undefined);
                    }}
                  />
                )}
              </Match>
              <Match
                when={field.kind === 'itemSearch' ? field : undefined}
                keyed
              >
                {itemField => (
                  /* 
                   * OMS-REG-RPT-10.28: the item picker's two-key write — the
                   * scoped key = the item's id plus the hard-coded sibling
                   * `itemName` shipped templates print (contract "Arguments").
                   */
                  <ItemSearch
                    label={itemField.label}
                    storeId={currentStoreId() ?? ''}
                    value={selectValue(itemField.key)}
                    selectedItem={pickedItems[itemField.key]}
                    error={requiredError(itemField)}
                    onSelect={item => {
                      setPickedItems(itemField.key, item ?? undefined);
                      setValues(itemField.key, item?.id ?? undefined);
                      setValues('itemName', item?.name ?? undefined);
                    }}
                  />
                )}
              </Match>
              <Match
                when={field.kind === 'reasonOption' ? field : undefined}
                keyed
              >
                {reasonField => (
                  /**
                   * OMS-REG-RPT-10.30: active inventory-adjustment reasons
                   * only.
                   */
                  <Combobox<ReasonOption>
                    label={reasonField.label}
                    items={adjustmentReasons()}
                    loading={reasonOptionsResource.loading()}
                    itemToString={reason => reason.reason}
                    itemToValue={reason => reason.id}
                    value={selectValue(reasonField.key)}
                    error={requiredError(reasonField)}
                    onChange={reason =>
                      setValues(reasonField.key, reason?.id ?? undefined)
                    }
                  />
                )}
              </Match>
              <Match
                when={field.kind === 'periodSearch' ? field : undefined}
                keyed
              >
                {periodField => (
                  /* 
                   * OMS-REG-RPT-10.31: the write forks on the scoped key — id
                   * at `periodId`, span (+ `before` companion) anywhere else
                   * (periodSearchWrites).
                   */
                  <PeriodArgumentField
                    field={periodField}
                    storeId={currentStoreId()}
                    programId={programIdArg()}
                    value={values[periodField.key]}
                    error={requiredError(periodField)}
                    onPick={period =>
                      applyWrites(periodSearchWrites(periodField.key, period))
                    }
                  />
                )}
              </Match>
              <Match
                when={field.kind === 'scheduleForm' ? field : undefined}
                keyed
              >
                {sfField => (
                  /* 
                   * OMS-REG-RPT-10.35: the cascade ignores its scoped key and
                   * writes the five flat keys via scheduleCascadeWrites; the
                   * schema's required list gates the keys it renders (see
                   * submit).
                   */
                  <ScheduleFormFields
                    storeId={currentStoreId() ?? ''}
                    programs={programs()}
                    programsLoading={programsData.loading}
                    programId={selectValue('programId')}
                    scheduleId={selectValue('scheduleId')}
                    periodId={selectValue('periodId')}
                    after={selectValue('after')}
                    before={selectValue('before')}
                    errorFor={key =>
                      attempted() &&
                      sfField.requiredKeys.includes(key) &&
                      isEmpty(key)
                        ? t('error.field-required')
                        : undefined
                    }
                    onWrites={applyWrites}
                  />
                )}
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
                  locations={locations()}
                  loading={locationsData.loading}
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
