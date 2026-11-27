import {
  createEffect,
  createSignal,
  createUniqueId,
  on,
  Show,
  type JSX,
} from 'solid-js';
import { TimeField as KTimeField } from '@kobalte/core/time-field';
import { locale, t } from '../../../intl';
import { CalendarIcon } from '../../icons';
import { Popover } from '../feedback/Popover';
import type { FocusTarget } from '../../utils/createFocusTarget';
import { ClearButton } from './ClearButton';
import { FieldShell } from './FieldShell';
import { DatePickerPanel } from './DatePickerPanel';
import {
  defaultDateFormat,
  formatCalendarDate,
  formatPlaceholder,
  hhmmToTime,
  localPartsToInstant,
  parseDateInput,
  timeToHhmm,
  instantToLocalParts,
  type TimeValue,
} from './dateTimeConvert';
import {
  dateToCalendarDate,
  calendarDateToDate,
} from '../../../intl/calendarDate';
import styles from './DateTimeFields.module.css';

export interface DateTimeFieldProps {
  label: string;
  /** Max-width cap — opt-in; defaults to `full` (see FieldShell). */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * The stored instant as a UTC ISO 8601 string, or null/undefined when empty.
   */
  value?: string | null;
  /** Fired with the new UTC ISO instant, or null when cleared. */
  onChange?: (value: string | null) => void;
  /**
   * Earliest selectable instant, UTC ISO (date-level bound on the calendar).
   */
  min?: string;
  /** Latest selectable instant, UTC ISO (date-level bound on the calendar). */
  max?: string;
  /** Date display + typed-entry format (see DateField). */
  format?: string;
  /**
   * 12-hour (am/pm) or 24-hour time segments. Defaults to the device locale.
   */
  hourCycle?: 12 | 24;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field (see FieldShell). Ignored under
   * `hideLabel`.
   */
  labelInfo?: JSX.Element;
  id?: string;
  /** `data-testid` stamped on the DATE input — the field's first focusable and
   *  the part a test types into (e2e/TESTIDS.md). The clear button takes
   *  `<testId>-clear`. */
  testId?: string;
  /** Focus destination (kdd/focus-targets) — lands on the date input, where
   *  entry starts. */
  focusTarget?: FocusTarget;
}

/*
 * The time segments' value while no time is held. Kobalte reads an `undefined`
 * value as uncontrolled and keeps showing the last time it had, so a cleared
 * field would still show one; an empty object stays controlled and shows each
 * segment's placeholder.
 */
const NO_TIME: TimeValue = {};

/*
 * Date-and-time input (spec: ui-standards/inputs.md § Dates & times). Date and
 * time co-exist in one input frame: the date is a typed text field + corvu
 * calendar popover (per the `format`), the time is Kobalte's segmented
 * TimeField — both headless, identical in every browser.
 *
 * The stored value is a UTC instant (schema `DateTime<Utc>`) but the user edits
 * a LOCAL wall-clock date + time; this field owns the conversion boundary at
 * the DEVICE timezone (no store/server timezone). Editing the date (typed or
 * picked) or the time recombines the two local parts into the UTC instant;
 * nothing above sees anything but UTC. A date with a blank time defaults to
 * midnight; clearing the date emits null — by blanking the date text,
 * deselecting the day, or the ✕ button an optional field shows while it holds
 * anything (#2054), which empties the time too. A required field shows no ✕;
 * blanking it still empties it, so the form's own required check reports it
 * (a Save as visited on an encounter relies on that). Both parts are buffered
 * locally so the time survives being set before a date.
 */
export const DateTimeField = (props: DateTimeFieldProps) => {
  const autoId = createUniqueId();
  const dateId = () => props.id ?? autoId; // label focuses the date input
  const fmt = () => props.format ?? defaultDateFormat();
  // The date input: the clear button removes itself on activation, so it hands
  // focus here rather than letting it fall to <body>.
  let dateEl: HTMLInputElement | undefined;

  const parts = () => instantToLocalParts(props.value);
  const [dateText, setDateText] = createSignal(
    formatCalendarDate(parts()?.date, fmt())
  );
  const [time, setTime] = createSignal<TimeValue | undefined>(
    hhmmToTime(parts()?.time)
  );
  // Typed in since the last shown date — see DateField's `edited`.
  let edited = false;
  const showDate = (dateIso: string | null | undefined) => {
    setDateText(formatCalendarDate(dateIso, fmt()));
    edited = false;
  };
  // The instant last shown as set: the parent's, or one sent.
  let shown: string | null = null;
  const showValue = () => {
    const p = instantToLocalParts(props.value);
    showDate(p?.date);
    setTime(hhmmToTime(p?.time));
    shown = props.value ?? null;
  };
  // Resync both buffers from the external value only when IT (or the app
  // language — month names) changes.
  createEffect(on([() => props.value, locale], showValue));
  // A refused save reverts — see DateField.
  createEffect(
    on(
      () => props.error,
      error => {
        if (error) showValue();
      },
      { defer: true }
    )
  );

  const emit = (dateIso: string | null, t: TimeValue | undefined) => {
    const next = dateIso
      ? localPartsToInstant(dateIso, timeToHhmm(t) ?? '')
      : null;
    // Still empty: unsent typing cleared, or a time with no date.
    if (next === null && shown === null) return;
    shown = next;
    props.onChange?.(next);
  };

  // Apply a committed date: write the local date buffer directly AND emit the
  // recombined UTC instant, so a picked/typed date shows even when the parent
  // doesn't echo `value` back (uncontrolled use). Mirrors the time path (which
  // already updates its own buffer) — keeps date and time symmetric, no extra
  // state.
  const applyDate = (dateIso: string | null) => {
    showDate(dateIso);
    emit(dateIso, time());
  };

  const commitDate = () => {
    if (!edited) return;
    const parsed = parseDateInput(dateText(), fmt());
    if (parsed === undefined) {
      showDate(parts()?.date); // invalid → revert
      return;
    }
    applyDate(parsed);
  };

  const boundDate = (utc: string | undefined) =>
    calendarDateToDate(instantToLocalParts(utc)?.date) ?? undefined;

  return (
    <FieldShell
      label={props.label}
      width={props.width}
      hideLabel={props.hideLabel}
      required={props.required}
      error={props.error}
      helperText={props.helperText}
      labelInfo={props.labelInfo}
      controlId={dateId()}
    >
      {shell => (
        <div
          class={styles.control}
          data-size={props.size === 'small' ? 'small' : undefined}
          data-error={props.error ? '' : undefined}
          data-disabled={props.disabled ? '' : undefined}
          data-clearable={!props.required && !props.disabled ? '' : undefined}
        >
          <input
            id={dateId()}
            ref={(el: HTMLInputElement) => {
              dateEl = el;
              props.focusTarget?.ref(el);
            }}
            type="text"
            class={styles.dateInput}
            data-testid={props.testId}
            value={dateText()}
            placeholder={formatPlaceholder(fmt())}
            disabled={props.disabled}
            aria-label={t('label.field-date-part', { label: props.label })}
            aria-describedby={shell.describedBy}
            aria-invalid={shell.invalid}
            onInput={e => {
              setDateText(e.currentTarget.value);
              edited = true;
            }}
            onBlur={commitDate}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur(); // commits via onBlur
            }}
          />
          <Popover
            placement="bottom-end"
            triggerClass={styles.iconBtn}
            triggerLabel={t('label.open-calendar')}
            triggerProps={{ disabled: props.disabled }}
            trigger={<CalendarIcon class={styles.calendarIcon} />}
          >
            {close => (
              <DatePickerPanel
                value={calendarDateToDate(parts()?.date)}
                min={boundDate(props.min)}
                max={boundDate(props.max)}
                onSelect={d => {
                  applyDate(d ? dateToCalendarDate(d) : null);
                  close();
                }}
              />
            )}
          </Popover>
          <span class={styles.divider} aria-hidden="true" />
          <KTimeField
            class={styles.timeRoot}
            value={time() ?? NO_TIME}
            onChange={(t: TimeValue | null) => {
              setTime(t ?? undefined);
              emit(parts()?.date ?? null, t ?? undefined);
            }}
            aria-label={t('label.field-time-part', { label: props.label })}
            hourCycle={props.hourCycle}
            disabled={props.disabled}
            onKeyDown={(e: KeyboardEvent) => {
              // Enter exits the field (the value commits live per segment).
              if (e.key === 'Enter' && e.target instanceof HTMLElement)
                e.target.blur();
            }}
          >
            <KTimeField.Input class={styles.timeSegs}>
              {segment => (
                <KTimeField.Segment
                  class={styles.timeSeg}
                  segment={segment()}
                />
              )}
            </KTimeField.Input>
          </KTimeField>
          {/* At the end: it empties the date AND the time. */}
          <Show
            when={
              (dateText() !== '' || time() !== undefined) &&
              !props.required &&
              !props.disabled
            }
          >
            <ClearButton
              fieldLabel={props.label}
              testId={props.testId && `${props.testId}-clear`}
              onClear={() => {
                setTime(undefined);
                applyDate(null);
              }}
              refocus={() => dateEl?.focus()}
            />
          </Show>
        </div>
      )}
    </FieldShell>
  );
};
