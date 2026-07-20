import { createEffect } from 'solid-js';
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
 *
 * The value is deliberately NOT a controlled `value` binding. A partially
 * edited date (say the year segment cleared) reads back as '' — a plain
 * controlled binding echoes that '' straight into `input.value`, and THAT
 * assignment makes the browser clear every other segment too (backspace in
 * the year would wipe day + month). Instead the incoming ISO value is written
 * imperatively, and only when it differs from what the DOM already reports —
 * the echo becomes a no-op and mid-edit segments survive.
 */
export const DateInput = (props: DateInputProps) => {
  let input: HTMLInputElement | undefined;
  createEffect(() => {
    const next = props.value ?? '';
    if (input && input.value !== next) input.value = next;
  });
  return (
    <TextField
      type="date"
      label={props.label}
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
      ref={element => {
        input = element;
        // The effect above may have run before the ref existed (first mount).
        element.value = props.value ?? '';
      }}
      onInput={event => props.onChange?.(event.currentTarget.value)}
    />
  );
};
