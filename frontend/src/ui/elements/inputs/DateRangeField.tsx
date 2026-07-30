import { createUniqueId, Show, type JSX } from 'solid-js';
import { CalendarIcon, CloseIcon } from '../../icons';
import { Popover } from '../feedback/Popover';
import type { FocusTarget } from '../../utils/createFocusTarget';
import { t } from '../../../intl';
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
  /** Max-width cap: `short` (default) or `full` (see FieldShell). */
  width?: 'short' | 'full';
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
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field (see FieldShell). Ignored under
   * `hideLabel`.
   */
  labelInfo?: JSX.Element;
  id?: string;
  /** `data-testid` stamped on the trigger button (e2e/TESTIDS.md). */
  testId?: string;
  /**
   * Focus destination (kdd/focus-targets) — the field's focusable is the
   * popover trigger, inside the Popover composition, so a plain ref can't
   * reach it.
   */
  focusTarget?: FocusTarget;
}

const EMPTY: IsoDateRange = { start: null, end: null };

/*
 * One side of the range in the picker's footer: its label, the picked date (or
 * the trigger's own '…' placeholder), and — only once set — its own clear.
 * A component rather than a helper returning JSX so each read stays a prop
 * getter, i.e. reactive (kdd/solid-reactivity-pitfalls §3).
 *
 * `display: contents` (see .rangeSide) puts these three straight into the
 * footer's grid, so From and To line up in columns down the stack. That makes
 * the cell COUNT load-bearing: an unset side renders an empty stand-in where
 * its clear would be, or grid auto-placement would pull the next row's label
 * up into the gap.
 */
const RangeSide = (props: {
  label: string;
  /** The formatted date, or null while this side is unset. */
  value: string | null;
  clearLabel: string;
  testId?: string;
  onClear: () => void;
}) => (
  <span class={styles.rangeSide}>
    <span class={styles.rangeSideLabel}>{props.label}</span>
    <span
      class={styles.rangeSideValue}
      data-empty={props.value ? undefined : ''}
    >
      {props.value ?? '…'}
    </span>
    <Show when={props.value} fallback={<span />}>
      <button
        type="button"
        class={styles.rangeSideClear}
        aria-label={props.clearLabel}
        data-testid={props.testId}
        onClick={props.onClear}
      >
        <CloseIcon />
      </button>
    </Show>
  </span>
);

/*
 * Date-range input (spec: ui-standards/inputs.md § Dates & times). The same
 * corvu calendar as DateField, in `range` mode — pick the start, then the end;
 * the popover closes once both are set. Value is a `{ start, end }` pair of
 * plain ISO `YYYY-MM-DD` dates (no timezone), passing straight through.
 *
 * The calendar can only ever fill start-then-end, so a ONE-SIDED range — "on or
 * before 12 Mar", which every layer above and below this field already carries
 * (either side is nullable, and both wire conversions drop a null side) — is
 * reached by clearing a side in the picker's footer: each side has its own
 * clear, plus a Clear dates for the pair (Carl 2026-07-30). That also makes a
 * partial range a deliberate commit rather than the side effect of dismissing
 * the popover mid-pick, which is how a start-only range used to happen.
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
          <Popover
            placement="bottom-start"
            triggerClass={styles.dateTrigger}
            triggerTestId={props.testId}
            focusTarget={props.focusTarget}
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
                  {display() ?? props.placeholder ?? t('label.select-dates')}
                </span>
                <CalendarIcon class={styles.calendarIcon} />
              </>
            }
          >
            {close => (
              <div class={styles.rangePanel}>
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
                {/* The two sides as picked, each clearable — the only way to
                    express a one-sided range (see the component comment).
                    STACKED, not side by side: one row of From · To · Clear
                    measures wider than the calendar, and the grid stretches to
                    the panel, so a single row spread the days out (Carl
                    2026-07-31). */}
                <div class={styles.rangeFooter}>
                  <div class={styles.rangeSides}>
                    <RangeSide
                      label={t('label.from')}
                      value={fmt(range().start)}
                      clearLabel={t('label.clear-from-date')}
                      testId={props.testId && `${props.testId}-clear-from`}
                      onClear={() =>
                        props.onChange?.({ start: null, end: range().end })
                      }
                    />
                    <RangeSide
                      label={t('label.to')}
                      value={fmt(range().end)}
                      clearLabel={t('label.clear-to-date')}
                      testId={props.testId && `${props.testId}-clear-to`}
                      onClear={() =>
                        props.onChange?.({ start: range().start, end: null })
                      }
                    />
                  </div>
                  {/* Only offered when there IS something to clear — and
                      labelled "dates", not "all", so it never reads as the
                      filter bar's own Clear all (which drops every filter). */}
                  <Show when={range().start || range().end}>
                    <button
                      type="button"
                      class={styles.rangeClear}
                      data-testid={
                        props.testId && `${props.testId}-clear-dates`
                      }
                      onClick={() => props.onChange?.(EMPTY)}
                    >
                      {t('label.clear-dates')}
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </Popover>
        </div>
      )}
    </FieldShell>
  );
};
