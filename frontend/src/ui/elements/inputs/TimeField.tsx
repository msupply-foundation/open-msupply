import { children, Show, type JSX } from 'solid-js';
import { TimeField as KTimeField } from '@kobalte/core/time-field';
import { AlertTriangleIcon } from '../../icons';
import { hhmmToTime, timeToHhmm, type TimeValue } from './dateTimeConvert';
import styles from './DateTimeFields.module.css';

export interface TimeFieldProps {
  label: string;
  /**
   * Wall-clock time of day, `HH:mm` (24-hour), or null/undefined when empty.
   */
  value?: string | null;
  /** Fired with the new `HH:mm` time, or null when cleared. */
  onChange?: (value: string | null) => void;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** 12-hour (am/pm) or 24-hour segments. Defaults to the device locale. */
  hourCycle?: 12 | 24;
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field. Kept outside the label element so it
   * isn't part of the control's accessible name. Ignored under `hideLabel`.
   * As TextField / FieldShell.
   */
  labelInfo?: JSX.Element;
}

/*
 * Time-of-day input (spec: ui-standards/inputs.md § Dates & times). Our markup
 * + tokens over Kobalte's headless TimeField — segmented spin-button
 * hour/minute fields (type digits or arrow to step; can't hold an invalid
 * time), the same "buy the behaviour, own the look" bargain as our other
 * Kobalte widgets, and no new dependency (Kobalte is already in). Renders
 * identically everywhere.
 *
 * The value is a plain 24-hour `HH:mm` string with no date and no timezone —
 * there is no GraphQL `Time` scalar, so it passes straight through; clearing
 * emits null. (Kobalte carries the time as `{ hour, minute }`; we convert at
 * the edge.) The 12-/24-hour display follows the device locale.
 */
export const TimeField = (props: TimeFieldProps) => {
  // The label element itself (text + required asterisk). A local component so
  // it renders fresh in either branch (bare, or beside labelInfo) — reusing
  // one JSX node across both would try to mount it in two places. As
  // TextField / FieldShell.
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const labelInfo = children(() => props.labelInfo);
  const Label = () => (
    <KTimeField.Label
      class={props.hideLabel ? styles.labelHidden : styles.label}
    >
      {props.label}
      <Show when={props.required}>
        <span class={styles.required} aria-hidden="true">
          *
        </span>
      </Show>
    </KTimeField.Label>
  );

  return (
    <KTimeField
      class={styles.field}
      value={hhmmToTime(props.value)}
      onChange={(t: TimeValue | null) => props.onChange?.(timeToHhmm(t))}
      hourCycle={props.hourCycle}
      validationState={props.error ? 'invalid' : 'valid'}
      required={props.required}
      disabled={props.disabled}
      onKeyDown={(e: KeyboardEvent) => {
        // Enter exits the field (the value already commits live per segment).
        if (e.key === 'Enter' && e.target instanceof HTMLElement)
          e.target.blur();
      }}
    >
      <Show when={labelInfo() && !props.hideLabel} fallback={<Label />}>
        {/* labelInfo sits OUTSIDE the label element, as a sibling: nested in it
          its accessible name would leak into the control's (the
          name-from-label computation concatenates descendant controls). */}
        <span class={styles.labelRow}>
          <Label />
          {labelInfo()}
        </span>
      </Show>
      <div
        class={styles.control}
        data-error={props.error ? '' : undefined}
        data-disabled={props.disabled ? '' : undefined}
      >
        <KTimeField.Input class={`${styles.timeSegs} ${styles.timeSolo}`}>
          {segment => (
            <KTimeField.Segment class={styles.timeSeg} segment={segment()} />
          )}
        </KTimeField.Input>
      </div>
      <Show when={props.helperText && !props.error}>
        <KTimeField.Description class={styles.helper}>
          {props.helperText}
        </KTimeField.Description>
      </Show>
      <KTimeField.ErrorMessage class={styles.error}>
        <AlertTriangleIcon class={styles.errorIcon} />
        {props.error}
      </KTimeField.ErrorMessage>
    </KTimeField>
  );
};
