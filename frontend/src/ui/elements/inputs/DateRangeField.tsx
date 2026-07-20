import { createUniqueId } from 'solid-js';
import { CalendarIcon } from '../../icons';
import { Popover } from '../feedback/Popover';
import { FieldShell } from './FieldShell';
import { DatePickerPanel } from './DatePickerPanel';
import {
  DEFAULT_DATE_FORMAT,
  dateToIsoDate,
  formatIsoDate,
  isoDateToDate,
} from './dateTimeConvert';
import styles from './DateTimeFields.module.css';

/** A date range as ISO calendar dates (`YYYY-MM-DD`), either side nullable. */
export interface IsoDateRange {
  start: string | null;
  end: string | null;
}

export interface DateRangeFieldProps {
  label: string;
  value?: IsoDateRange;
  /** Fired as the range is picked (start first, then end). */
  onChange?: (value: IsoDateRange) => void;
  /** Earliest selectable date, ISO `YYYY-MM-DD`. Earlier dates unselectable. */
  min?: string;
  /** Latest selectable date, ISO `YYYY-MM-DD`. Later dates unselectable. */
  max?: string;
  /** Date display format (see DateField). Range entry is pick-only. */
  format?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  hideLabel?: boolean;
  id?: string;
}

const EMPTY: IsoDateRange = { start: null, end: null };

/*
 * Date-range input (spec: ui-standards/inputs.md § Dates & times). The same
 * corvu calendar as DateField, in `range` mode — pick the start, then the end;
 * the popover closes once both are set. Value is a `{ start, end }` pair of
 * plain ISO `YYYY-MM-DD` dates (no timezone), passing straight through.
 */
export const DateRangeField = (props: DateRangeFieldProps) => {
  const autoId = createUniqueId();
  const id = () => props.id ?? autoId;
  const range = () => props.value ?? EMPTY;

  const fmt = (iso: string | null) =>
    formatIsoDate(iso, props.format ?? DEFAULT_DATE_FORMAT) || null;

  const display = () => {
    const { start, end } = range();
    if (!start && !end) return null;
    return `${fmt(start) ?? '…'} – ${fmt(end) ?? '…'}`;
  };

  return (
    <FieldShell
      label={props.label}
      hideLabel={props.hideLabel}
      required={props.required}
      error={props.error}
      helperText={props.helperText}
      controlId={id()}
    >
      {({ describedBy, invalid }) => (
        <div
          class={styles.control}
          data-size={props.size === 'small' ? 'small' : undefined}
          data-error={props.error ? '' : undefined}
          data-disabled={props.disabled ? '' : undefined}
        >
          <Popover
            placement="bottom-start"
            triggerClass={styles.dateTrigger}
            triggerProps={{
              id: id(),
              'aria-describedby': describedBy,
              'aria-invalid': invalid,
              disabled: props.disabled,
            }}
            trigger={
              <>
                <span
                  class={
                    display()
                      ? styles.dateText
                      : `${styles.dateText} ${styles.placeholder}`
                  }
                >
                  {display() ?? props.placeholder ?? 'Select dates'}
                </span>
                <CalendarIcon class={styles.calendarIcon} />
              </>
            }
          >
            {close => (
              <DatePickerPanel
                mode="range"
                value={{
                  from: isoDateToDate(range().start),
                  to: isoDateToDate(range().end),
                }}
                min={isoDateToDate(props.min) ?? undefined}
                max={isoDateToDate(props.max) ?? undefined}
                onSelect={r => {
                  props.onChange?.({
                    start: r.from ? dateToIsoDate(r.from) : null,
                    end: r.to ? dateToIsoDate(r.to) : null,
                  });
                  if (r.from && r.to) close();
                }}
              />
            )}
          </Popover>
        </div>
      )}
    </FieldShell>
  );
};
