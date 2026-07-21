import { createEffect, createSignal, createUniqueId, on } from 'solid-js';
import { TimeField as KTimeField } from '@kobalte/core/time-field';
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
  hhmmToTime,
  isoDateToDate,
  localPartsToUtc,
  parseDateInput,
  timeToHhmm,
  utcToLocalParts,
  type TimeValue,
} from './dateTimeConvert';
import styles from './DateTimeFields.module.css';

export interface DateTimeFieldProps {
  label: string;
  /** Max-width cap: `short` (default) or `full` (see FieldShell). */
  width?: 'short' | 'full';
  /** The stored instant as a UTC ISO 8601 string, or null/undefined when empty. */
  value?: string | null;
  /** Fired with the new UTC ISO instant, or null when cleared. */
  onChange?: (value: string | null) => void;
  /** Earliest selectable instant, UTC ISO (date-level bound on the calendar). */
  min?: string;
  /** Latest selectable instant, UTC ISO (date-level bound on the calendar). */
  max?: string;
  /** Date display + typed-entry format (see DateField). */
  format?: string;
  /** 12-hour (am/pm) or 24-hour time segments. Defaults to the device locale. */
  hourCycle?: 12 | 24;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  id?: string;
}

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
 * midnight; clearing the date emits null. Both parts are buffered locally so
 * the time survives being set before a date.
 */
export const DateTimeField = (props: DateTimeFieldProps) => {
  const autoId = createUniqueId();
  const dateId = () => props.id ?? autoId; // label focuses the date input
  const fmt = () => props.format ?? DEFAULT_DATE_FORMAT;

  const parts = () => utcToLocalParts(props.value);
  const [dateText, setDateText] = createSignal(
    formatIsoDate(parts()?.date, fmt())
  );
  const [time, setTime] = createSignal<TimeValue | undefined>(
    hhmmToTime(parts()?.time)
  );
  // Resync both buffers from the external value only when IT (or the app
  // language — month names) changes.
  createEffect(
    on([() => props.value, locale], () => {
      const p = utcToLocalParts(props.value);
      setDateText(formatIsoDate(p?.date, fmt()));
      setTime(hhmmToTime(p?.time));
    })
  );

  const emit = (dateIso: string | null, t: TimeValue | undefined) =>
    props.onChange?.(
      dateIso ? localPartsToUtc(dateIso, timeToHhmm(t) ?? '') : null
    );

  // Apply a committed date: write the local date buffer directly AND emit the
  // recombined UTC instant, so a picked/typed date shows even when the parent
  // doesn't echo `value` back (uncontrolled use). Mirrors the time path (which
  // already updates its own buffer) — keeps date and time symmetric, no extra
  // state.
  const applyDate = (dateIso: string | null) => {
    setDateText(formatIsoDate(dateIso, fmt()));
    emit(dateIso, time());
  };

  const commitDate = () => {
    const parsed = parseDateInput(dateText(), fmt());
    if (parsed === undefined) {
      setDateText(formatIsoDate(parts()?.date, fmt())); // invalid → revert
      return;
    }
    applyDate(parsed);
  };

  const boundDate = (utc: string | undefined) =>
    isoDateToDate(utcToLocalParts(utc)?.date) ?? undefined;

  return (
    <FieldShell
      label={props.label}
      width={props.width}
      hideLabel={props.hideLabel}
      required={props.required}
      error={props.error}
      helperText={props.helperText}
      controlId={dateId()}
    >
      {({ describedBy, invalid }) => (
        <div
          class={styles.control}
          data-size={props.size === 'small' ? 'small' : undefined}
          data-error={props.error ? '' : undefined}
          data-disabled={props.disabled ? '' : undefined}
        >
          <input
            id={dateId()}
            type="text"
            class={styles.dateInput}
            value={dateText()}
            placeholder={formatPlaceholder(fmt())}
            disabled={props.disabled}
            aria-label={`${props.label}, date`}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            onInput={e => setDateText(e.currentTarget.value)}
            onBlur={commitDate}
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
                value={isoDateToDate(parts()?.date)}
                min={boundDate(props.min)}
                max={boundDate(props.max)}
                onSelect={d => {
                  applyDate(d ? dateToIsoDate(d) : null);
                  close();
                }}
              />
            )}
          </Popover>
          <span class={styles.divider} aria-hidden="true" />
          <KTimeField
            class={styles.timeRoot}
            value={time()}
            onChange={(t: TimeValue | null) => {
              setTime(t ?? undefined);
              emit(parts()?.date ?? null, t ?? undefined);
            }}
            aria-label={`${props.label}, time`}
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
        </div>
      )}
    </FieldShell>
  );
};
