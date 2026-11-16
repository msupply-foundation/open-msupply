import { createSignal, createUniqueId, Show, type JSX } from 'solid-js';
import { locale, t } from '../../../intl';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import type { FocusTarget } from '../../utils/createFocusTarget';
import { Popover } from '../feedback/Popover';
import { FieldShell } from './FieldShell';
import {
  MonthGrid,
  YearGrid,
  YEARS_PER_PAGE,
  yearPageStart,
} from './MonthYearGrids';
import {
  formatMonth,
  isMonthOutside,
  parseMonthValue,
  toMonthValue,
} from './monthValue';
import styles from './DateTimeFields.module.css';
import panelStyles from './DatePickerPanel.module.css';

export interface MonthFieldProps {
  label: string;
  /** Max-width cap — opt-in; defaults to `full` (see FieldShell). */
  width?: 'compact' | 'short' | 'long' | 'full';
  /** A calendar month, `YYYY-MM`, or null/undefined when empty. */
  value?: string | null;
  /** Fired with the picked month, `YYYY-MM`. */
  onChange?: (value: string) => void;
  /** Earliest selectable month, `YYYY-MM`, inclusive. */
  min?: string;
  /** Latest selectable month, `YYYY-MM`, inclusive. */
  max?: string;
  /** Shown in the field while it's empty. */
  placeholder?: string;
  helperText?: string;
  error?: string;
  /** An affordance after the label text (an InfoTooltip) — see FieldShell. */
  labelInfo?: JSX.Element;
  required?: boolean;
  disabled?: boolean;
  size?: 'default' | 'small';
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  id?: string;
  /** Focus destination for the trigger (kdd/focus-targets). */
  focusTarget?: FocusTarget;
  /** `data-testid` for the trigger button (e2e/TESTIDS.md). */
  testId?: string;
}

/*
 * Calendar-month input (spec: ui-standards/inputs.md § Dates & times), for a
 * figure kept per month — a monthly report, a reporting period. A button
 * showing the month in words ("August 2026") opens a popover with the year's
 * twelve months; the year in its header pages through years, as the date
 * picker's month view does (the grids are shared: MonthYearGrids). There's no
 * typed entry, unlike DateField: a month is two clicks away, and month names
 * are the part people mistype.
 *
 * Value is `YYYY-MM`. A month outside `min`/`max` can't be picked. The field
 * can't be cleared: a month picker stands for a period that always exists.
 */
export const MonthField = (props: MonthFieldProps) => {
  const autoId = createUniqueId();
  const id = () => props.id ?? autoId;
  const display = () => formatMonth(props.value, locale());

  // The year the panel shows, and whether it shows that year's months or a
  // page of years. Reset to the value's year each time the panel opens.
  const [year, setYear] = createSignal(new Date().getFullYear());
  const [view, setView] = createSignal<'month' | 'year'>('month');
  // Set whenever the year view opens, from the year shown
  const [yearBase, setYearBase] = createSignal(0);
  const onOpen = () => {
    setYear(parseMonthValue(props.value)?.year ?? new Date().getFullYear());
    setView('month');
  };

  const minYear = () => parseMonthValue(props.min)?.year;
  const maxYear = () => parseMonthValue(props.max)?.year;

  const navBtn = (
    label: string,
    onClick: () => void,
    icon: JSX.Element,
    disabled?: boolean
  ) => (
    <button
      type="button"
      class={panelStyles.navBtn}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );

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
            onOpen={onOpen}
            trigger={
              <>
                <span
                  class={
                    display()
                      ? styles.dateText
                      : `${styles.dateText} ${styles.placeholder}`
                  }
                >
                  {display() || props.placeholder || t('label.select-month')}
                </span>
                <CalendarIcon class={styles.calendarIcon} />
              </>
            }
          >
            {close => (
              <div class={panelStyles.calendar}>
                <div class={panelStyles.header}>
                  <Show when={view() === 'month'}>
                    {navBtn(
                      'Previous year',
                      () => setYear(year() - 1),
                      <ChevronLeftIcon />,
                      minYear() !== undefined && year() <= minYear()!
                    )}
                    <button
                      type="button"
                      class={panelStyles.headingBtn}
                      onClick={() => {
                        setYearBase(yearPageStart(year()));
                        setView('year');
                      }}
                    >
                      {year()}
                    </button>
                    {navBtn(
                      'Next year',
                      () => setYear(year() + 1),
                      <ChevronRightIcon />,
                      maxYear() !== undefined && year() >= maxYear()!
                    )}
                  </Show>
                  <Show when={view() === 'year'}>
                    {navBtn(
                      'Previous years',
                      () => setYearBase(yearBase() - YEARS_PER_PAGE),
                      <ChevronLeftIcon />
                    )}
                    <span class={panelStyles.headingLabel}>
                      {yearBase()}–{yearBase() + YEARS_PER_PAGE - 1}
                    </span>
                    {navBtn(
                      'Next years',
                      () => setYearBase(yearBase() + YEARS_PER_PAGE),
                      <ChevronRightIcon />
                    )}
                  </Show>
                </div>

                <Show when={view() === 'month'}>
                  <MonthGrid
                    selected={(() => {
                      const ym = parseMonthValue(props.value);
                      return ym?.year === year() ? ym.month : undefined;
                    })()}
                    disabled={m =>
                      isMonthOutside(
                        toMonthValue(year(), m),
                        props.min,
                        props.max
                      )
                    }
                    onPick={m => {
                      props.onChange?.(toMonthValue(year(), m));
                      close();
                    }}
                  />
                </Show>
                <Show when={view() === 'year'}>
                  <YearGrid
                    pageStart={yearBase()}
                    selected={year()}
                    disabled={yr =>
                      (minYear() !== undefined && yr < minYear()!) ||
                      (maxYear() !== undefined && yr > maxYear()!)
                    }
                    onPick={yr => {
                      setYear(yr);
                      setView('month');
                    }}
                  />
                </Show>
              </div>
            )}
          </Popover>
        </div>
      )}
    </FieldShell>
  );
};
