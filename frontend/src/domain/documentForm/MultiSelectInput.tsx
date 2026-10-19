/*
 * The form library's multi-select: several values from an enum, the JSON Forms
 * `EnumArray` control, over the UI library's `MultiSelect`. It writes the
 * chosen values at its path as an array, in the order they were chosen, and
 * removes the property when the last one goes, as the old client's control
 * does. The options are listed by label, alphabetically in the session's
 * language, as the old client lists them.
 *
 * With `confirmRemove`, taking a value off (its tag's cross, Backspace, or
 * unticking it in the list) asks first, as the old client's control does;
 * cancelling leaves the selection as it was.
 */
import { createSignal, type JSX } from 'solid-js';
import { locale, t } from '../../intl';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { MultiSelect } from '../../ui/elements/selectors/MultiSelect';
import { nameFieldInSummary, type Draft } from './draft';
import type { FieldProps } from './fields';
import type { EnumArrayPath, PathValue } from './paths';

type Item<V> = V extends readonly (infer E)[] ? E : never;

export interface MultiSelectInputProps<
  T,
  P extends EnumArrayPath<T>,
> extends FieldProps {
  draft: Draft<T>;
  path: P;
  /**
   * The label for every value the type allows. The type makes this complete:
   * a value the enum gains is a compile error here until it has a label.
   */
  options: Record<Item<NonNullable<PathValue<T, P>>> & string, string>;
  /** Ask before a chosen value is taken off. */
  confirmRemove?: boolean;
}

interface UntypedArrayDraft {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  schemaFor(path: string): { required: boolean } | undefined;
  errorFor(path: string): string | undefined;
  readOnly(): boolean;
}

/*
 * The values the control lists: every labelled one, ordered by its label in
 * the session's language, then any stored value with no label (one the type
 * has since dropped), under its own value, so the record reads as it is.
 */
export const multiSelectItems = (
  labels: Readonly<Record<string, string>>,
  selected: readonly string[],
  language: string
): string[] => {
  const known = Object.keys(labels).sort((a, b) =>
    (labels[a] ?? a).localeCompare(labels[b] ?? b, language)
  );
  return [...known, ...selected.filter(v => !known.includes(v))];
};

export const MultiSelectInput = <T, P extends EnumArrayPath<T>>(
  props: MultiSelectInputProps<T, P>
): JSX.Element => {
  const d = () => props.draft as unknown as UntypedArrayDraft;
  // The error summary names the field as it shows itself.
  nameFieldInSummary(props);
  const labels = () => props.options as Record<string, string>;
  const selected = (): string[] => {
    const value = d().get(props.path);
    return Array.isArray(value) ? (value as string[]) : [];
  };
  const items = () => multiSelectItems(labels(), selected(), locale());
  const write = (values: string[]) =>
    d().set(props.path, values.length > 0 ? values : undefined);
  const [pending, setPending] = createSignal<string[]>();
  const onChange = (values: string[]) => {
    if (props.confirmRemove && values.length < selected().length) {
      setPending(values);
      return;
    }
    write(values);
  };
  return (
    <>
      <MultiSelect
        label={props.label}
        helperText={props.helperText}
        items={items()}
        itemToString={value => labels()[value] ?? value}
        itemToValue={value => value}
        selectedItems={selected()}
        onChange={onChange}
        error={d().errorFor(props.path)}
        required={d().schemaFor(props.path)?.required ?? false}
        disabled={props.disabled === true || d().readOnly()}
        inputTestId={props.testId}
      />
      <ConfirmDialog
        open={pending() !== undefined}
        onClose={() => setPending(undefined)}
        title={t('label.remove')}
        message={t('messages.confirm-remove-item')}
        onConfirm={() => {
          const values = pending();
          if (values) write(values);
        }}
      />
    </>
  );
};
