import {
  createEffect,
  createSignal,
  createUniqueId,
  on,
  type JSX,
} from 'solid-js';
import { locale } from '../../../intl';
import { CalendarIcon } from '../../icons';
import { Popover } from '../feedback/Popover';
import { FieldShell } from './FieldShell';
import { DatePickerPanel } from './DatePickerPanel';
import {
  DEFAULT_DATE_FORMAT,
  dateToIsoDate,
  formatIsoDate,
  formatPlaceholder,
  isoDateToDate,
  parseDateInput,
} from './dateTimeConvert';
import styles from './DateTimeFields.module.css';

export interface DateFieldProps {
  label: string;
  /** Max-width cap — opt-in; defaults to `full`. `compact` (10rem box) /
   * `short` / `long` (see FieldShell). */
  width?: 'compact' | 'short' | 'long' | 'full';
  /** ISO calendar date `YYYY-MM-DD`, or null/undefined when empty. */
  value?: string | null;
  /** Fired with the new ISO date, or null when cleared. */
  onChange?: (value: string | null) => void;
  /** Earliest selectable date, ISO `YYYY-MM-DD`. Earlier dates unselectable. */
  min?: string;
  /** Latest selectable date, ISO `YYYY-MM-DD`. Later dates unselectable. */
  max?: string;
  /**
   * Display + typed-entry format, e.g. `dd/MM/yyyy`, `dd MMM yyyy` (default),
   * `MM/dd/yyyy`, `yyyy-MM-dd`. Tokens: d/dd, M/MM/MMM/MMMM, yy/yyyy.
   */
  format?: string;
  helperText?: string;
  error?: string;
  /**
   * An affordance rendered inline after the label text (an InfoTooltip) — for a
   * standing explanation, e.g. why the field is disabled, that would drag a
   * dense row taller as `helperText`. See FieldShell.
   */
  labelInfo?: JSX.Element;
  required?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  id?: string;
  /**
   * `data-testid` for the typed-entry text input (locale-stable test hook,
   * e2e/TESTIDS.md).
   */
  testId?: string;
}

/*
 * Calendar-date input (spec: ui-standards/inputs.md § Dates & times). A typed
 * text field (type e.g. "23/04/2023") paired with a corvu calendar popover (see
 * DatePickerPanel) behind a calendar icon — headless, so it renders identically
 * in every browser. Both display and typed parsing follow the `format` prop.
 *
 * Value IS the wire value: a plain ISO `YYYY-MM-DD` (schema `Date`, no
 * timezone) passes straight through. Typed text is parsed on blur/Enter
 * (invalid input reverts to the last value); picking from the calendar sets it
 * too; clearing emits null. `min`/`max` make out-of-range days unselectable.
 */
export const DateField = (props: DateFieldProps) => {
  const autoId = createUniqueId();
  const id = () => props.id ?? autoId;
  const fmt = () => props.format ?? DEFAULT_DATE_FORMAT;

  // Local text buffer for typing; resynced from the external value only when
  // IT (or the app language — month names, ui-standards/inputs.md) changes,
  // never mid-typing, so keystrokes don't get clobbered.
  const [text, setText] = createSignal(formatIsoDate(props.value, fmt()));
  createEffect(
    on([() => props.value, locale], ([v]) => setText(formatIsoDate(v, fmt())))
  );

  // Apply a committed value: notify the parent AND write the local text buffer
  // directly, so a selection shows even when the parent doesn't echo `value`
  // back (uncontrolled use). Shared by the typed-commit and calendar-pick paths
  // so the two stay symmetric — reuses the existing buffer, no extra state.
  const apply = (iso: string | null) => {
    props.onChange?.(iso);
    setText(formatIsoDate(iso, fmt()));
  };

  const commit = () => {
    const parsed = parseDateInput(text(), fmt());
    // Rejection gate — parseDateInput is tri-state (undefined = unparseable,
    // null = deliberately blanked, string = a valid ISO date). Any arm true →
    // the entry reverts to the last good value, like invalid input; onChange
    // never fires. ISO YYYY-MM-DD compares chronologically as a plain string.
    if (
      // Unparseable text: gibberish, or an impossible date (31 Feb).
      parsed === undefined ||
      // Blanked a required field: a required value must always exist, so a
      // blank reverts. (Non-required fields pass null through — the "cleared"
      // path.) The calendar's deselect is guarded separately, via corvu's own
      // required prop on DatePickerPanel.
      (parsed === null && props.required) ||
      // A valid date, but TYPED earlier than min — the calendar already makes
      // such days unselectable; this closes the typed path.
      (parsed != null && props.min !== undefined && parsed < props.min) ||
      // A valid date, but TYPED later than max — same as min, other bound.
      (parsed != null && props.max !== undefined && parsed > props.max)
    ) {
      setText(formatIsoDate(props.value, fmt())); // invalid → revert
      return;
    }
    apply(parsed);
  };

  return (
    <FieldShell
      label={props.label}
      width={props.width}
      hideLabel={props.hideLabel}
      required={props.required}
      error={props.error}
      helperText={props.helperText}
      labelInfo={props.labelInfo}
      controlId={id()}
    >
      {({ describedBy, invalid }) => (
        <div
          class={styles.control}
          data-size={props.size === 'small' ? 'small' : undefined}
          data-error={props.error ? '' : undefined}
          data-disabled={props.disabled ? '' : undefined}
        >
          <input
            id={id()}
            type="text"
            class={styles.dateInput}
            data-testid={props.testId}
            value={text()}
            placeholder={formatPlaceholder(fmt())}
            disabled={props.disabled}
            required={props.required}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onInput={e => setText(e.currentTarget.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur(); // commits via onBlur
            }}
          />
          <Popover
            placement="bottom-end"
            triggerClass={styles.iconBtn}
            triggerLabel="Open calendar"
            triggerProps={{ disabled: props.disabled }}
            trigger={<CalendarIcon class={styles.calendarIcon} />}
          >
            {close => (
              <DatePickerPanel
                value={isoDateToDate(props.value)}
                min={isoDateToDate(props.min) ?? undefined}
                max={isoDateToDate(props.max) ?? undefined}
                // Also stops the calendar DESELECTING (click the selected day
                // again → null) — the commit() guard below only covers the
                // typed path.
                required={props.required}
                onSelect={d => {
                  apply(d ? dateToIsoDate(d) : null);
                  close();
                }}
              />
            )}
          </Popover>
        </div>
      )}
    </FieldShell>
  );
};
