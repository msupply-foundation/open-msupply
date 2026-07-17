import { splitProps } from 'solid-js';
import { TextField, type TextFieldProps } from './TextField';
import styles from './DateTimeFields.module.css';

export interface TimeFieldProps extends Omit<
  TextFieldProps,
  'type' | 'value' | 'onChange' | 'onInput' | 'min' | 'max'
> {
  /** Wall-clock time of day, `HH:mm` (24-hour), or null/undefined when empty. */
  value?: string | null;
  /** Fired with the new `HH:mm` time, or null when the field is cleared. */
  onChange?: (value: string | null) => void;
  /** Earliest selectable time, `HH:mm`. Earlier times unselectable. */
  min?: string;
  /** Latest selectable time, `HH:mm`. Later times unselectable. */
  max?: string;
}

/*
 * Time-of-day input (spec: ui-standards/inputs.md § Dates & times). The native
 * <input type="time">, wrapped in TextField for the shared input chrome — no
 * library. On Chromium the indicator opens a real clock-list picker; the
 * `.picker` class swaps the glyph to our ClockIcon and brands the segments.
 *
 * The value is a plain 24-hour `HH:mm` wall-clock string with **no timezone**
 * and **no date** — a time of day (a cutoff/preference, or composed into a
 * DateTime elsewhere). There is no GraphQL `Time` scalar, so the value passes
 * straight through as a string; clearing emits null. The displayed format
 * (12-/24-hour) follows the device/OS locale — see DIVERGENCES D21.
 */
export const TimeField = (props: TimeFieldProps) => {
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
      type="time"
      value={local.value ?? ''}
      min={local.min}
      max={local.max}
      onInput={e => local.onChange?.(e.currentTarget.value || null)}
    />
  );
};
