/*
 * The form component library, minimal set (kdd/custom-forms/specs.md § Forms
 * in the UI; implementation-plan H3): one field per kind of value a document
 * holds, each a thin wrapper over the host input of that kind. A field takes
 * the draft and a path into the document type; the path's type decides which
 * fields accept it (a NumberInput only takes a number path), so a typo or a
 * wrong kind of field fails to compile.
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
import { FormSection } from '../../ui/layout/Form/FormSection';
import {
  localDayToUtc,
  utcToLocalDay,
} from '../../ui/elements/inputs/dateTimeConvert';
import type { Draft } from './draft';
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
}

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
      error={d().errorFor(props.path)}
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

/*
 * A calendar day. How it is stored follows the schema's `format` at the path:
 * `date` stores the ISO day; `date-time` stores the start of the chosen local
 * day as an RFC 3339 instant, which is what the server's Schedule event rules
 * read (they fall back to the document's own time for anything else).
 */
export const DateInput = <T, P extends TextPath<T>>(
  props: DateInputProps<T, P>
): JSX.Element => {
  const d = () => untyped(props.draft);
  const isDateTime = () =>
    d().schemaFor(props.path as never)?.format === 'date-time';
  const value = () => {
    const v = d().get(props.path) as string | undefined;
    return isDateTime() ? utcToLocalDay(v) : (v ?? null);
  };
  const write = (day: string | null) => {
    if (!day) d().set(props.path, undefined);
    else d().set(props.path, isDateTime() ? localDayToUtc(day) : day);
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
