import { TextField } from './TextField';

export interface DateInputProps {
  label: string;
  /** ISO date string (yyyy-mm-dd) or '' for empty. */
  value?: string;
  /** Reports the new ISO date string (or '' when cleared). */
  onChange?: (value: string) => void;
  helperText?: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  disabled?: boolean;
  /** Earliest selectable date (ISO). Used by DateRangeInput to constrain end >= start. */
  min?: string;
  /** Latest selectable date (ISO). */
  max?: string;
  id?: string;
  class?: string;
  testId?: string;
}

/*
 * DateInput — the native <input type="date"> with the same label / helper /
 * error / required / hideLabel API shape as TextField. It IS a TextField (a
 * thin composition, per kdd/explicit-composition): the browser owns the date
 * picker + the a11y/keyboard contract, and TextField owns the styling +
 * label/message wiring, so there's nothing to re-style and no new CSS. The ISO
 * string in/out mirrors the current app's date filters. `min`/`max` constrain
 * the range (DateRangeInput uses them to keep end >= start).
 */
export const DateInput = (props: DateInputProps) => (
  <TextField
    type="date"
    label={props.label}
    value={props.value ?? ''}
    helperText={props.helperText}
    error={props.error}
    required={props.required}
    hideLabel={props.hideLabel}
    disabled={props.disabled}
    min={props.min}
    max={props.max}
    id={props.id}
    class={props.class}
    data-testid={props.testId}
    onInput={event => props.onChange?.(event.currentTarget.value)}
  />
);
