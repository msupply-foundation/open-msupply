import { splitProps } from 'solid-js';
import { TextField, type TextFieldProps } from './TextField';
import styles from './DateTimeFields.module.css';

export interface DateFieldProps extends Omit<
  TextFieldProps,
  'type' | 'value' | 'onChange' | 'onInput' | 'min' | 'max'
> {
  /** ISO calendar date `YYYY-MM-DD`, or null/undefined when empty. */
  value?: string | null;
  /** Fired with the new ISO date, or null when the field is cleared. */
  onChange?: (value: string | null) => void;
  /** Earliest selectable date, ISO `YYYY-MM-DD`. Earlier dates unselectable. */
  min?: string;
  /** Latest selectable date, ISO `YYYY-MM-DD`. Later dates unselectable. */
  max?: string;
}

/*
 * Calendar-date input (spec: ui-standards/inputs.md § Dates & times). The
 * native <input type="date">, wrapped in TextField so it inherits the whole
 * input chrome — label / helper / error / required / aria wiring — with no
 * duplication ("own the simple", no library). The `.picker` class brands the
 * native in-field parts (indicator glyph, segment highlight) via
 * DateTimeFields.module.css; the pop-up calendar overlay is the platform's.
 *
 * The value IS the wire value: a plain ISO `YYYY-MM-DD` (schema `Date`, no
 * timezone) passes straight through — no conversion, unlike DateTimeField.
 * Clearing the field emits null, matching a nullable schema field. `min`/`max`
 * make out-of-range dates unselectable (a vertical's "future dates
 * unselectable" / backdating-window rule is expressed as bounds here).
 *
 * The in-field display format follows the device/OS locale, and the picker
 * tracks the theme via `color-scheme` (set on the dark root in tokens.css) —
 * see DIVERGENCES D21.
 */
export const DateField = (props: DateFieldProps) => {
  const [local, rest] = splitProps(props, [
    'value',
    'onChange',
    'min',
    'max',
    'class',
  ]);
  return (
    <TextField
      {...rest}
      class={local.class ? `${styles.picker} ${local.class}` : styles.picker}
      type="date"
      value={local.value ?? ''}
      min={local.min}
      max={local.max}
      onInput={e => local.onChange?.(e.currentTarget.value || null)}
    />
  );
};
