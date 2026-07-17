import { splitProps } from 'solid-js';
import { TextField, type TextFieldProps } from './TextField';
import styles from './DateTimeFields.module.css';

export interface DateTimeFieldProps extends Omit<
  TextFieldProps,
  'type' | 'value' | 'onChange' | 'onInput' | 'min' | 'max'
> {
  /** The stored instant as a UTC ISO 8601 string, or null/undefined when empty. */
  value?: string | null;
  /** Fired with the new UTC ISO instant, or null when the field is cleared. */
  onChange?: (value: string | null) => void;
  /** Earliest selectable instant, UTC ISO. Earlier instants unselectable. */
  min?: string;
  /** Latest selectable instant, UTC ISO. Later instants unselectable. */
  max?: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * A stored UTC instant → the local wall-clock string a `datetime-local` input
 * edits (`YYYY-MM-DDTHH:mm`, minute precision). Uses the device timezone (the
 * getters are local). Empty/invalid → '' (an empty input).
 */
const toLocalInput = (utc: string | null | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/**
 * The edited local wall-clock string → the UTC ISO instant to store. A
 * datetime string with no zone is parsed as *local* time (ES spec), so
 * `toISOString()` yields the correct UTC instant for the device timezone.
 * Empty/invalid → null (a cleared, nullable field).
 */
const toUtc = (localValue: string): string | null => {
  if (!localValue) return null;
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/*
 * Date-and-time input (spec: ui-standards/inputs.md § Dates & times). The
 * native <input type="datetime-local">, wrapped in TextField for the shared
 * input chrome (label / helper / error / required / aria) — no library. The
 * `.picker` class brands the in-field parts (indicator, segment highlight);
 * the pop-up overlay is the platform's.
 *
 * Unlike DateField, the value does NOT pass through: the stored value is a UTC
 * instant (schema `DateTime<Utc>`), but the user edits a *local wall-clock*
 * date + time. This field owns the conversion boundary — UTC → local for
 * display, local → UTC on change — anchored to the **device timezone** (the
 * user's own clock; no store/server timezone is in play). `min`/`max` are also
 * UTC ISO and converted the same way. Nothing above this field sees anything
 * but the UTC instant. Minute precision; clearing emits null.
 *
 * The in-field format follows the device/OS locale and the picker tracks the
 * theme via `color-scheme` — see DIVERGENCES D21.
 */
export const DateTimeField = (props: DateTimeFieldProps) => {
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
      type="datetime-local"
      value={toLocalInput(local.value)}
      min={local.min ? toLocalInput(local.min) : undefined}
      max={local.max ? toLocalInput(local.max) : undefined}
      onInput={e => local.onChange?.(toUtc(e.currentTarget.value))}
    />
  );
};
