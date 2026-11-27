import {
  createEffect,
  createSignal,
  createUniqueId,
  on,
  Show,
  type JSX,
} from 'solid-js';
import { locale, t } from '../../../intl';
import { CalendarIcon } from '../../icons';
import { Popover } from '../feedback/Popover';
import { ClearButton } from './ClearButton';
import { FieldShell } from './FieldShell';
import { DatePickerPanel } from './DatePickerPanel';
import {
  defaultDateFormat,
  formatCalendarDate,
  formatPlaceholder,
  parseDateInput,
} from './dateTimeConvert';
import {
  dateToCalendarDate,
  calendarDateToDate,
} from '../../../intl/calendarDate';
import styles from './DateTimeFields.module.css';

export interface DateFieldProps {
  label: string;
  /** Max-width cap — opt-in; defaults to `full`. `compact` (10rem box) /
   * `short` / `long` (see FieldShell). */
  width?: 'compact' | 'short' | 'long' | 'full';
  /** A calendar date, `YYYY-MM-DD`, or null/undefined when empty. */
  value?: string | null;
  /** Fired with the new calendar date, or null when cleared. */
  onChange?: (value: string | null) => void;
  /** Earliest selectable date, ISO `YYYY-MM-DD`. Earlier dates unselectable. */
  min?: string;
  /** Latest selectable date, ISO `YYYY-MM-DD`. Later dates unselectable. */
  max?: string;
  /**
   * Display + typed-entry format, e.g. `dd/MM/yyyy`, `dd MMM yyyy`,
   * `MM/dd/yyyy`, `yyyy-MM-dd`. Tokens: d/dd, M/MM/MMM/MMMM, yy/yyyy. Defaults
   * to the app language's numeric short date (`dd/MM/yyyy` in English), the
   * same pattern read-only dates render with (#774).
   */
  format?: string;
  /**
   * Pick a whole month: the calendar opens on its month grid, the field shows
   * and reads `MMM yyyy` (unless `format` says otherwise), and the value is
   * the month's 1st. `min`/`max` bound by month — a month holding any
   * in-range day stays selectable.
   */
  monthOnly?: boolean;
  helperText?: string;
  error?: string;
  /** Advisory warning below the field (FieldShell's `warning`). */
  warning?: string;
  /** `data-testid` for the warning message (e2e/TESTIDS.md). */
  warningTestId?: string;
  /**
   * The typed-entry `<input>` — what a focus target binds to
   * (ui/utils/createFocusTarget), as TextField forwards its own `ref`.
   */
  ref?: (el: HTMLInputElement) => void;
  /**
   * An affordance rendered inline after the label text (an InfoTooltip) — for a
   * standing explanation, e.g. why the field is disabled, that would drag a
   * dense row taller as `helperText`. See FieldShell.
   */
  labelInfo?: JSX.Element;
  required?: boolean;
  /**
   * `false`: the date can be moved but not removed (e.g. a received date). No
   * ✕ and a blank reverts, as with `required`, but there's no asterisk.
   */
  clearable?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  id?: string;
  /**
   * `data-testid` for the typed-entry text input (locale-stable test hook,
   * e2e/TESTIDS.md). The clear button takes `<testId>-clear`.
   */
  testId?: string;
}

/** A month-only field's display + typed-entry format, e.g. "Oct 2026". */
const MONTH_FORMAT = 'MMM yyyy';

/*
 * Calendar-date input (spec: ui-standards/inputs.md § Dates & times). A typed
 * text field (type e.g. "23/04/2023") paired with a corvu calendar popover (see
 * DatePickerPanel) behind a calendar icon — headless, so it renders identically
 * in every browser. Both display and typed parsing follow the `format` prop.
 *
 * Value IS the wire value: a calendar date, `YYYY-MM-DD` (schema `NaiveDate`, no
 * timezone) passes straight through. Typed text is parsed on blur/Enter
 * (invalid input reverts to the last value); picking from the calendar sets it
 * too; clearing (blank text, deselected day or ✕) emits null. `min`/`max`
 * make out-of-range days unselectable.
 */
export const DateField = (props: DateFieldProps) => {
  const autoId = createUniqueId();
  const id = () => props.id ?? autoId;
  const fmt = () =>
    props.format ?? (props.monthOnly ? MONTH_FORMAT : defaultDateFormat());
  // Month-only bounds compare by month (`YYYY-MM`): the month holding `min`
  // is in range though its 1st is earlier.
  const bound = (iso: string) => (props.monthOnly ? iso.slice(0, 7) : iso);
  const canClear = () => !props.required && props.clearable !== false;

  // Bumped each time the picker popover opens — the panel survives close, so
  // it re-seeds its navigation view via this (DatePickerPanel's `openCount`).
  const [openCount, setOpenCount] = createSignal(0);

  // Where the ✕ hands focus after a clear.
  let inputEl: HTMLInputElement | undefined;

  // Local text buffer for typing; resynced from the external value only when
  // IT (or the app language — month names, ui-standards/inputs.md) changes,
  // never mid-typing, so keystrokes don't get clobbered.
  const [text, setText] = createSignal(formatCalendarDate(props.value, fmt()));
  // Typed in since the last shown value; blur sends only then. Not a compare
  // with the last value sent, which would swallow a retry after a refusal.
  let edited = false;
  // The value last shown as set: the parent's, or one sent.
  let shown: string | null = null;
  const show = (iso: string | null | undefined) => {
    setText(formatCalendarDate(iso, fmt()));
    edited = false;
    shown = iso ?? null;
  };
  createEffect(on([() => props.value, locale], ([v]) => show(v)));
  // A refused save (`error` on, value kept) reverts to the parent's value.
  createEffect(
    on(
      () => props.error,
      error => {
        if (error) show(props.value);
      },
      { defer: true }
    )
  );

  // Apply a committed value: notify the parent AND write the local text buffer
  // directly, so a selection shows even when the parent doesn't echo `value`
  // back (uncontrolled use). Shared by the typed-commit, calendar-pick and
  // clear paths so they stay symmetric.
  const apply = (iso: string | null) => {
    const wasEmpty = shown === null;
    show(iso);
    // Nothing was sent, so there's nothing to clear.
    if (iso === null && wasEmpty) return;
    props.onChange?.(iso);
  };

  const commit = () => {
    if (!edited) return;
    const parsed = parseDateInput(text(), fmt());
    // Rejection gate — parseDateInput is tri-state (undefined = unparseable,
    // null = deliberately blanked, string = a valid calendar date). Any arm true →
    // the entry reverts to the last good value, like invalid input; onChange
    // never fires. ISO YYYY-MM-DD compares chronologically as a plain string.
    if (
      // Unparseable text: gibberish, or an impossible date (31 Feb).
      parsed === undefined ||
      // Blanked a field that can't be cleared. The calendar's deselect is
      // guarded by DatePickerPanel's `required`.
      (parsed === null && !canClear()) ||
      // A valid date, but TYPED earlier than min — the calendar already makes
      // such days unselectable; this closes the typed path.
      (parsed != null &&
        props.min !== undefined &&
        bound(parsed) < bound(props.min)) ||
      // A valid date, but TYPED later than max — same as min, other bound.
      (parsed != null &&
        props.max !== undefined &&
        bound(parsed) > bound(props.max))
    ) {
      show(props.value); // invalid → revert
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
      warning={props.warning}
      warningTestId={props.warningTestId}
      helperText={props.helperText}
      labelInfo={props.labelInfo}
      controlId={id()}
    >
      {shell => (
        <div
          class={styles.control}
          data-size={props.size === 'small' ? 'small' : undefined}
          data-error={props.error ? '' : undefined}
          data-disabled={props.disabled ? '' : undefined}
          data-clearable={canClear() && !props.disabled ? '' : undefined}
        >
          <input
            ref={el => {
              inputEl = el;
              props.ref?.(el);
            }}
            id={id()}
            type="text"
            class={styles.dateInput}
            data-testid={props.testId}
            value={text()}
            placeholder={formatPlaceholder(fmt())}
            disabled={props.disabled}
            required={props.required}
            aria-describedby={shell.describedBy}
            aria-invalid={shell.invalid}
            onInput={e => {
              setText(e.currentTarget.value);
              edited = true;
            }}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur(); // commits via onBlur
            }}
          />
          <Show when={text() !== '' && canClear() && !props.disabled}>
            <ClearButton
              fieldLabel={props.label}
              testId={props.testId && `${props.testId}-clear`}
              onClear={() => apply(null)}
              refocus={() => inputEl?.focus()}
            />
          </Show>
          <Popover
            placement="bottom-end"
            triggerClass={styles.iconBtn}
            triggerLabel={t('label.open-calendar')}
            triggerProps={{ disabled: props.disabled }}
            onOpen={() => setOpenCount(count => count + 1)}
            trigger={<CalendarIcon class={styles.calendarIcon} />}
          >
            {close => (
              <DatePickerPanel
                value={calendarDateToDate(props.value)}
                min={calendarDateToDate(props.min) ?? undefined}
                max={calendarDateToDate(props.max) ?? undefined}
                // Also stops the calendar DESELECTING (click the selected day
                // again → null) — the commit() guard below only covers the
                // typed path.
                required={!canClear()}
                monthOnly={props.monthOnly}
                openCount={openCount()}
                onSelect={d => {
                  apply(d ? dateToCalendarDate(d) : null);
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
