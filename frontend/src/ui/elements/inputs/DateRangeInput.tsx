import { createUniqueId, Show } from 'solid-js';
import { AlertTriangleIcon } from '../../icons';
import { DateInput } from './DateInput';
import styles from './DateRangeInput.module.css';

export interface DateRange {
  /** ISO date string (yyyy-mm-dd) or '' for empty. */
  start: string;
  end: string;
}

export interface DateRangeInputProps {
  /** Group label — a <legend> for the fieldset. */
  label: string;
  start?: string;
  end?: string;
  /** Reports the whole range whenever either end changes. */
  onChange?: (range: DateRange) => void;
  /** Accessible name for the start field (visually hidden). */
  startLabel?: string;
  /** Accessible name for the end field (visually hidden). */
  endLabel?: string;
  /** One combined error message for the pair (presence styles both fields). */
  error?: string;
  required?: boolean;
  /** Visually hide the group <legend> (kept for a11y). */
  hideLabel?: boolean;
  disabled?: boolean;
  class?: string;
}

/*
 * DateRangeInput — a paired start/end DateInput in one labelled row (the
 * current app's date-range filter). A <fieldset>/<legend> groups the pair; each
 * DateInput hides its own label (the legend names the group, and each field
 * keeps its own visually-hidden accessible name). The inputs constrain each
 * other by construction — start's `max` is the chosen end and end's `min` is
 * the chosen start — so the browser won't let the user pick end < start. One
 * combined error slot sits below the row (icon + text, never colour alone).
 */
export const DateRangeInput = (props: DateRangeInputProps) => {
  const messageId = createUniqueId();

  return (
    <fieldset
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      aria-describedby={props.error ? messageId : undefined}
    >
      <legend class={props.hideLabel ? styles.legendHidden : styles.legend}>
        {props.label}
        <Show when={props.required}>
          <span class={styles.required} aria-hidden="true">
            *
          </span>
        </Show>
      </legend>
      <div class={styles.row} data-error={props.error ? '' : undefined}>
        <DateInput
          label={props.startLabel ?? 'Start date'}
          hideLabel
          value={props.start}
          max={props.end || undefined}
          disabled={props.disabled}
          onChange={start => props.onChange?.({ start, end: props.end ?? '' })}
        />
        <span class={styles.separator} aria-hidden="true">
          –
        </span>
        <DateInput
          label={props.endLabel ?? 'End date'}
          hideLabel
          value={props.end}
          min={props.start || undefined}
          disabled={props.disabled}
          onChange={end => props.onChange?.({ start: props.start ?? '', end })}
        />
      </div>
      <Show when={props.error}>
        <p id={messageId} class={styles.error}>
          <AlertTriangleIcon class={styles.errorIcon} />
          {props.error}
        </p>
      </Show>
    </fieldset>
  );
};
