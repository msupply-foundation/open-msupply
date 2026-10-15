/*
 * The form component library, minimal set (kdd/custom-forms/specs.md § Forms in
 * the UI): one field per kind of value a document holds, each a thin wrapper
 * over the host input of that kind. A field takes the draft and a path into the
 * document type; the path's type decides which fields accept it (a NumberInput
 * only takes a number path), so a typo or a wrong kind of field fails to
 * compile.
 *
 * What a field does not take as a prop comes from the draft: the value, the
 * required asterisk (the schema's `required`), the error (AJV, or a
 * previously recorded value a migration left unresolved) and read-only. A
 * form is explicit composition (kdd/explicit-composition): it renders each
 * field by name, in the order it wants, with nothing generated from the
 * schema.
 */
import type { JSX } from 'solid-js';
import { TextField } from '../../ui/elements/inputs/TextField';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { DateField } from '../../ui/elements/inputs/DateField';
import { DateTimeField } from '../../ui/elements/inputs/DateTimeField';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { Select } from '../../ui/elements/selectors/Select';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { Divider } from '../../ui/elements/display/Divider';
import { DateOfBirthControl } from '../patient/PatientControls';
import { utcToLocalDay } from '../../ui/elements/inputs/dateTimeConvert';
import { t } from '../../intl';
import type { Draft, HostDraft } from './draft';
import type {
  BooleanPath,
  EnumPath,
  NumberPath,
  PathValue,
  TextPath,
} from './paths';

/** What every field takes besides its draft and path. */
export interface FieldProps {
  /** The field's label, already translated. */
  label: string;
  /** Shown below the field when it has no error. */
  helperText?: string;
  /** Disables the field whatever the draft's read-only state. */
  disabled?: boolean;
  /** `data-testid` for the control (e2e/TESTIDS.md). */
  testId?: string;
}

/*
 * The draft seen by path string. The field's own props already pinned the
 * path to the document type, so inside a field the type-level checking has
 * done its work and the draft is read and written by string.
 */
interface UntypedDraft {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  schemaFor: Draft<object>['schemaFor'];
  errorFor(path: string): string | undefined;
  // The host's draft has it; a plugin test's stub draft need not.
  failedRule?: HostDraft<object>['failedRule'];
  readOnly(): boolean;
}
const untyped = <T,>(draft: Draft<T>) => draft as unknown as UntypedDraft;

const isDisabled = (d: UntypedDraft, p: FieldProps) =>
  p.disabled === true || d.readOnly();

const required = (d: UntypedDraft, path: string) =>
  d.schemaFor(path as never)?.required ?? false;

export interface TextInputProps<T, P extends TextPath<T>> extends FieldProps {
  draft: Draft<T>;
  path: P;
  /**
   * A value in the expected form (`112334`), shown in the message when the
   * value fails the schema's `pattern`, as a deployment's JSON Forms
   * `examples` were: "Incorrect format. Use: "112334"".
   */
  example?: string;
}

/**
 * The message a text field shows: a pattern failure names the field's
 * example where it has one; any other message is the draft's.
 */
export const textFieldError = (
  message: string | undefined,
  rule: string | undefined,
  example: string | undefined
): string | undefined =>
  message !== undefined && rule === 'pattern' && example !== undefined
    ? t('error.document-invalid-format-example', { example })
    : message;

/** A single line of free text. Cleared, the property is removed. */
export const TextInput = <T, P extends TextPath<T>>(
  props: TextInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  return (
    <TextField
      label={props.label}
      helperText={props.helperText}
      value={(d().get(props.path) as string | undefined) ?? ''}
      onInput={e => d().set(props.path, e.currentTarget.value || undefined)}
      required={required(d(), props.path)}
      error={textFieldError(
        d().errorFor(props.path),
        d().failedRule?.(props.path as never),
        props.example
      )}
      disabled={isDisabled(d(), props)}
      data-testid={props.testId}
    />
  );
};

export interface TextAreaInputProps<
  T,
  P extends TextPath<T>,
> extends FieldProps {
  draft: Draft<T>;
  path: P;
  rows?: number;
}

/** Several lines of free text. */
export const TextAreaInput = <T, P extends TextPath<T>>(
  props: TextAreaInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  return (
    <TextArea
      label={props.label}
      helperText={props.helperText}
      rows={props.rows}
      value={(d().get(props.path) as string | undefined) ?? ''}
      onInput={e => d().set(props.path, e.currentTarget.value || undefined)}
      required={required(d(), props.path)}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      data-testid={props.testId}
    />
  );
};

export interface NumberInputProps<
  T,
  P extends NumberPath<T>,
> extends FieldProps {
  draft: Draft<T>;
  path: P;
  min?: number;
  max?: number;
  /** Decimal places allowed; the host input's own default otherwise. */
  decimalLimit?: number;
  /** A unit shown after the value, e.g. "kg". */
  unit?: string;
}

/** A number. Cleared, the property is removed. */
export const NumberInput = <T, P extends NumberPath<T>>(
  props: NumberInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  return (
    <NumberField
      label={props.label}
      helperText={props.helperText}
      value={d().get(props.path) as number | undefined}
      onChange={v => d().set(props.path, v)}
      min={props.min}
      max={props.max}
      decimalLimit={props.decimalLimit}
      endAdornment={props.unit}
      required={required(d(), props.path)}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      data-testid={props.testId}
    />
  );
};

export interface DateInputProps<T, P extends TextPath<T>> extends FieldProps {
  draft: Draft<T>;
  path: P;
}

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');

/**
 * A calendar day as a date-time value: the day's local start, written with
 * the local offset (`2026-10-08T00:00:00+13:00`), as the old client writes
 * one. The server's Schedule rules read it as the same instant a UTC value
 * would give, and the day it was recorded on stays readable in the value
 * itself, so a site in another timezone shows that day rather than the one
 * the instant falls on there.
 */
export const dayToDateTime = (isoDate: string): string => {
  const start = new Date(`${isoDate}T00:00:00`);
  const offset = -start.getTimezoneOffset();
  return (
    `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` +
    `T${pad(start.getHours())}:${pad(start.getMinutes())}:00` +
    `${offset < 0 ? '-' : '+'}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
};

/**
 * The calendar day a date-time value records: the day as written where the
 * value carries its own offset or is a bare date (a legacy document's), else
 * (a `Z` instant) the local day it falls on here.
 */
export const dateTimeToDay = (value: string | undefined): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const withOffset = /^(\d{4}-\d{2}-\d{2})T[^Z]*[+-]\d{2}:\d{2}$/.exec(value);
  return withOffset ? (withOffset[1] as string) : utcToLocalDay(value);
};

/*
 * A calendar day. How it is stored follows the schema's `format` at the path:
 * `date` stores the ISO day; `date-time` stores the start of the chosen local
 * day with its offset (dayToDateTime), an RFC 3339 instant, which is what the
 * server's Schedule event rules read (they fall back to the document's own
 * time for anything else).
 */
export const DateInput = <T, P extends TextPath<T>>(
  props: DateInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  const isDateTime = () =>
    d().schemaFor(props.path as never)?.format === 'date-time';
  const value = () => {
    const v = d().get(props.path) as string | undefined;
    return isDateTime() ? dateTimeToDay(v) : (v ?? null);
  };
  const write = (day: string | null) => {
    if (!day) d().set(props.path, undefined);
    else d().set(props.path, isDateTime() ? dayToDateTime(day) : day);
  };
  return (
    <DateField
      label={props.label}
      helperText={props.helperText}
      value={value()}
      onChange={write}
      required={required(d(), props.path)}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      testId={props.testId}
    />
  );
};

export interface DateTimeInputProps<
  T,
  P extends TextPath<T>,
> extends FieldProps {
  draft: Draft<T>;
  path: P;
}

/** A date and a time of day, stored as an RFC 3339 instant. */
export const DateTimeInput = <T, P extends TextPath<T>>(
  props: DateTimeInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  return (
    <DateTimeField
      label={props.label}
      helperText={props.helperText}
      value={(d().get(props.path) as string | undefined) ?? null}
      onChange={v => d().set(props.path, v ?? undefined)}
      required={required(d(), props.path)}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      testId={props.testId}
    />
  );
};

export interface SelectInputProps<T, P extends EnumPath<T>> extends FieldProps {
  draft: Draft<T>;
  path: P;
  /**
   * The label for every value the type allows. The type makes this complete:
   * a value the enum gains is a compile error here until it has a label.
   */
  options: Record<NonNullable<PathValue<T, P>> & string, string>;
  /**
   * Values the type keeps for the records that hold them but that are no
   * longer chosen: each is offered, with its label, only on a record that
   * holds it, so a historical value (the regimen given at that visit) stays
   * true of its record without being chosen again. The way to retire a value
   * that records what happened, where marking it unresolved in a migration
   * would replace it with a current one.
   */
  retired?: readonly (NonNullable<PathValue<T, P>> & string)[];
}

/**
 * The options a select offers, in `order`: each with its label, leaving out
 * a retired value unless it is the one the record holds.
 */
export const selectOptions = (
  order: readonly string[],
  labels: Readonly<Record<string, string>>,
  retired: readonly string[] | undefined,
  current: string | undefined
): { value: string; label: string }[] =>
  order
    .filter(value => value === current || !retired?.includes(value))
    .map(value => ({ value, label: labels[value] ?? value }));

/*
 * One value from an enum. The options are listed in the schema's own enum
 * order, so the list reads the way the type declares it; a value the loaded
 * schema does not have is not offered, whatever the labels say, and a retired
 * one only on the record that holds it.
 */
export const SelectInput = <T, P extends EnumPath<T>>(
  props: SelectInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  const labels = () => props.options as Record<string, string>;
  const options = () =>
    selectOptions(
      d().schemaFor(props.path as never)?.enum ?? Object.keys(labels()),
      labels(),
      props.retired,
      d().get(props.path) as string | undefined
    );
  const isRequired = () => required(d(), props.path);
  return (
    <Select
      label={props.label}
      helperText={props.helperText}
      options={options()}
      value={d().get(props.path) as string | undefined}
      onValueChange={v => d().set(props.path, v)}
      clearable={!isRequired()}
      onClear={() => d().set(props.path, undefined)}
      required={isRequired()}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      testId={props.testId}
    />
  );
};

export interface AutocompleteOption {
  /** What is stored at the path. */
  value: string;
  /** What the user sees and types against, already translated. */
  label: string;
}

export interface AutocompleteInputProps<
  T,
  P extends TextPath<T>,
> extends FieldProps {
  draft: Draft<T>;
  path: P;
  /**
   * The values offered, in the order shown, each with its label. The schema
   * holds the field as free text, so the list is the form's own and the
   * compiler cannot check it against the type, as it does a SelectInput's.
   */
  options: readonly AutocompleteOption[];
}

/**
 * The option a stored value shows as: its own from the list, or, for a value
 * the list leaves out, the value itself, so a record keeps showing what it
 * holds.
 */
export const autocompleteSelection = (
  options: readonly AutocompleteOption[],
  value: string | undefined
): AutocompleteOption | undefined =>
  value === undefined
    ? undefined
    : (options.find(o => o.value === value) ?? { value, label: value });

/*
 * One value from a preset list, at a free-text path: the list is the form's,
 * where the schema allows any text, as a deployment's JSON Forms Autocomplete
 * narrowed it. Typing filters the list, and nothing outside it can be
 * entered. A stored value the list leaves out (one an earlier list offered)
 * shows as stored on the record that holds it, and stays until another is
 * chosen; it is offered nowhere else. Where the values are fixed, an enum in
 * the type and a SelectInput carry them in the schema as well.
 */
export const AutocompleteInput = <T, P extends TextPath<T>>(
  props: AutocompleteInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  const value = () => d().get(props.path) as string | undefined;
  const isRequired = () => required(d(), props.path);
  return (
    <Combobox<AutocompleteOption>
      label={props.label}
      helperText={props.helperText}
      items={props.options as AutocompleteOption[]}
      itemToString={o => o.label}
      itemToValue={o => o.value}
      value={value()}
      selectedItem={autocompleteSelection(props.options, value())}
      onChange={o => d().set(props.path, o?.value)}
      clearable={!isRequired()}
      required={isRequired()}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      inputTestId={props.testId}
    />
  );
};

export interface CheckboxInputProps<T, P extends BooleanPath<T>> extends Omit<
  FieldProps,
  'helperText'
> {
  draft: Draft<T>;
  path: P;
}

/** A yes/no value. Unticked writes `false`, never removes the property. */
export const CheckboxInput = <T, P extends BooleanPath<T>>(
  props: CheckboxInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  return (
    <Checkbox
      label={props.label}
      checked={d().get(props.path) === true}
      onChange={checked => d().set(props.path, checked)}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      testId={props.testId}
    />
  );
};

export interface FieldGroupProps {
  /** The group's heading, already translated. */
  title: string;
  /**
   * Heading rank: `h2` on a record screen (the default), `h3` inside a dialog,
   * whose own title holds the h2. The group keeps its top-level look either
   * way.
   */
  headingLevel?: 'h2' | 'h3';
  children: JSX.Element;
}

/** A titled group of fields: the host's form section. */
export const FieldGroup = (props: FieldGroupProps): JSX.Element => (
  <FormSection
    title={props.title}
    headingLevel={props.headingLevel}
    heading="group"
  >
    {props.children}
  </FormSection>
);

export interface DateOfBirthInputProps<T, P extends TextPath<T>> extends Omit<
  FieldProps,
  'helperText'
> {
  draft: Draft<T>;
  /** A `format: date` path: the date is stored as `yyyy-MM-dd`. */
  path: P;
  /**
   * Where the record keeps whether the date was estimated from a typed age,
   * as the base patient's `dateOfBirthIsEstimated` does. An age entry writes
   * `true` there and a date entered directly removes it. Without one, nothing
   * is written for it, and the mark beside the label shows only while the
   * date is the one this session's age entry gave.
   */
  estimatedPath?: BooleanPath<T>;
}

/*
 * A date of birth with the age beside it, the host patient form's control for
 * any date of birth a document holds (a child's, a contact's). Either can be
 * entered: a date gives the age, and a typed age stores the first of January
 * of that year. Under a year old the age reads as months and days. The age's
 * label is the host's.
 */
export const DateOfBirthInput = <T, P extends TextPath<T>>(
  props: DateOfBirthInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  return (
    <DateOfBirthControl
      label={props.label}
      value={(d().get(props.path) as string | undefined) ?? null}
      estimated={
        props.estimatedPath === undefined
          ? undefined
          : d().get(props.estimatedPath) === true
      }
      onChange={(dob, fromAge) => {
        d().set(props.path, dob ?? undefined);
        if (props.estimatedPath !== undefined)
          d().set(props.estimatedPath, fromAge || undefined);
      }}
      required={required(d(), props.path)}
      error={d().errorFor(props.path)}
      disabled={isDisabled(d(), props)}
      testId={props.testId}
    />
  );
};

export interface FormDividerProps {
  /** `data-testid` for the rule (e2e/TESTIDS.md). */
  testId?: string;
}

/** A hairline rule between two runs of fields in one group. */
export const FormDivider = (props: FormDividerProps): JSX.Element => (
  <Divider data-testid={props.testId} />
);
