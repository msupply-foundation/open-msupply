import Calendar from '@corvu/calendar';
import {
  createEffect,
  createSignal,
  Index,
  on,
  Show,
  type JSX,
} from 'solid-js';
import { ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { dateToCalendarDate } from '../../../intl/calendarDate';
import { locale } from '../../../intl';
import {
  MonthGrid,
  YearGrid,
  YEARS_PER_PAGE,
  yearPageStart,
} from './MonthYearGrids';
import styles from './DatePickerPanel.module.css';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export type DatePickerPanelProps = {
  /** Earliest selectable local date, inclusive. */
  min?: Date;
  /** Latest selectable local date, inclusive. */
  max?: Date;
  /**
   * Prevent DESELECTION: corvu toggles a selected day off when it's clicked
   * again, emitting null — a field whose value must always exist passes
   * `required` so the calendar can't blank it (its typed-path guard alone
   * can't; a calendar pick bypasses the text commit).
   */
  required?: boolean;
  /**
   * Bumped by the host popover each time it re-opens (Popover's `onOpen`):
   * the panel stays mounted after its first open, so a month-only field's
   * picker would otherwise resume on whatever grid the user left (the year
   * grid, say) instead of opening on the month grid (OMS-REG-RPT-10.44).
   */
  openCount?: number;
} & (
  | {
      mode?: 'single';
      value: Date | null;
      /** Picked local date, or null when deselected. */
      onSelect: (date: Date | null) => void;
      /**
       * Pick a whole month: the panel opens on the month grid and a month
       * pick selects its 1st (the year grid still navigates). No day grid.
       */
      monthOnly?: boolean;
    }
  | {
      mode: 'range';
      value: DateRange;
      /** The (partial) range as the user picks from/to. */
      onSelect: (range: DateRange) => void;
    }
);

/**
 * The corvu render-prop fields this panel reads (single and range share them).
 */
interface CalendarCtx {
  month: Date;
  setMonth: (month: Date) => void;
  weekdays: Date[];
  weeks: Date[][];
}

/*
 * The calendar grid inside a date picker's popover — corvu's headless Calendar
 * (@corvu/calendar) with our own markup + tokens (the "buy the behaviour, own
 * the look" bargain, same as Kobalte). corvu supplies the WAI-ARIA
 * calendar-dialog keyboard grid (arrows / Home-End / PageUp-Down) and focus
 * management; we render every cell. Plain JS Date, no date library. Supports
 * `single` and `range` selection.
 *
 * Navigation has three views (day / month / year grids) so jumping to a distant
 * month isn't one step at a time — the month and year in the header are buttons
 * that open a month grid / paged year grid, driving corvu's `setMonth`. Date
 * bounds come through corvu's `disabled` predicate (its `min`/`max` are a
 * selection *count*, not date bounds); adjacent-month days are muted via a
 * `data-outside` flag we compute (corvu exposes no such attribute).
 */
export const DatePickerPanel = (props: DatePickerPanelProps) => {
  const monthOnly = () => props.mode !== 'range' && !!props.monthOnly;
  const [view, setView] = createSignal<'day' | 'month' | 'year'>(
    monthOnly() ? 'month' : 'day'
  );
  // Re-open → straight back to the field's default view. Deferred: the bump
  // for the FIRST open fires before this panel mounts, and the initial state
  // already is that default, so only a later re-open resets. Month-only
  // fields are the ones a spec case pins (see `openCount`).
  createEffect(
    on(
      () => props.openCount,
      () => {
        if (monthOnly()) setView('month');
      },
      { defer: true }
    )
  );
  const [yearBase, setYearBase] = createSignal(0);

  // The date the calendar should focus on (single value, or a range's start).
  const focusDate = (): Date | null =>
    props.mode === 'range' ? (props.value.from ?? props.value.to) : props.value;

  // Controlled displayed month, so the calendar FOLLOWS the value — when the
  // value changes (e.g. a date typed into the field), jump the grid to it,
  // rather than staying on the last-navigated month (initialMonth is one-shot).
  const [month, setMonth] = createSignal(focusDate() ?? new Date());
  createEffect(
    on(
      () => {
        const d = focusDate();
        return d ? dateToCalendarDate(d) : '';
      },
      () => {
        const d = focusDate();
        if (d) setMonth(d);
      }
    )
  );

  const disabled = (day: Date): boolean => {
    if (props.min && dateToCalendarDate(day) < dateToCalendarDate(props.min))
      return true;
    if (props.max && dateToCalendarDate(day) > dateToCalendarDate(props.max))
      return true;
    return false;
  };

  // Month-only: a month is out of range only when NO day of it is in range —
  // its last day before `min`, or its first day after `max`. Comparing the
  // month's two ends (not its 1st and its last) keeps a month holding both
  // bounds inside it selectable — e.g. min = the 2nd and max = today leaves
  // the intervening days valid (OMS-REG-RPT-10.44).
  const monthDisabled = (year: number, monthIndex: number): boolean =>
    (props.min !== undefined &&
      dateToCalendarDate(new Date(year, monthIndex + 1, 0)) <
        dateToCalendarDate(props.min)) ||
    (props.max !== undefined &&
      dateToCalendarDate(new Date(year, monthIndex, 1)) >
        dateToCalendarDate(props.max));

  // The month grid's highlighted month: the month on show, or month-only, the
  // field's value when it's in the year on show
  const selectedMonth = (ctx: CalendarCtx): number | undefined => {
    if (props.mode === 'range' || !props.monthOnly) return ctx.month.getMonth();
    return props.value?.getFullYear() === ctx.month.getFullYear()
      ? props.value.getMonth()
      : undefined;
  };

  const navBtn = (label: string, onClick: () => void, icon: JSX.Element) => (
    <button
      type="button"
      class={styles.navBtn}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  const header = (ctx: CalendarCtx): JSX.Element => {
    const y = () => ctx.month.getFullYear();
    const m = () => ctx.month.getMonth();
    return (
      <div class={styles.header}>
        <Show when={view() === 'day'}>
          {navBtn(
            'Previous month',
            () => ctx.setMonth(new Date(y(), m() - 1)),
            <ChevronLeftIcon />
          )}
          <div class={styles.monthYear}>
            <button
              type="button"
              class={styles.headingBtn}
              onClick={() => setView('month')}
            >
              {ctx.month.toLocaleDateString(locale(), {
                month: 'long',
                calendar: 'gregory',
              })}
            </button>
            <button
              type="button"
              class={styles.headingBtn}
              onClick={() => {
                setYearBase(yearPageStart(y()));
                setView('year');
              }}
            >
              {y()}
            </button>
          </div>
          {navBtn(
            'Next month',
            () => ctx.setMonth(new Date(y(), m() + 1)),
            <ChevronRightIcon />
          )}
        </Show>
        <Show when={view() === 'month'}>
          {navBtn(
            'Previous year',
            () => ctx.setMonth(new Date(y() - 1, m())),
            <ChevronLeftIcon />
          )}
          <button
            type="button"
            class={styles.headingBtn}
            onClick={() => {
              setYearBase(yearPageStart(y()));
              setView('year');
            }}
          >
            {y()}
          </button>
          {navBtn(
            'Next year',
            () => ctx.setMonth(new Date(y() + 1, m())),
            <ChevronRightIcon />
          )}
        </Show>
        <Show when={view() === 'year'}>
          {navBtn(
            'Previous years',
            () => setYearBase(yearBase() - YEARS_PER_PAGE),
            <ChevronLeftIcon />
          )}
          <span class={styles.headingLabel}>
            {yearBase()}–{yearBase() + YEARS_PER_PAGE - 1}
          </span>
          {navBtn(
            'Next years',
            () => setYearBase(yearBase() + YEARS_PER_PAGE),
            <ChevronRightIcon />
          )}
        </Show>
      </div>
    );
  };

  const body = (ctx: CalendarCtx): JSX.Element => (
    <div class={styles.calendar}>
      {header(ctx)}

      <Show when={view() === 'day'}>
        <Calendar.Table class={styles.grid}>
          <thead>
            <tr>
              <Index each={ctx.weekdays}>
                {weekday => (
                  <Calendar.HeadCell
                    class={styles.weekday}
                    abbr={weekday().toLocaleDateString(locale(), {
                      weekday: 'long',
                    })}
                  >
                    {weekday().toLocaleDateString(locale(), {
                      weekday: 'narrow',
                    })}
                  </Calendar.HeadCell>
                )}
              </Index>
            </tr>
          </thead>
          <tbody>
            <Index each={ctx.weeks}>
              {week => (
                <tr>
                  <Index each={week()}>
                    {day => (
                      <Calendar.Cell class={styles.cell}>
                        <Calendar.CellTrigger
                          day={day()}
                          class={styles.day}
                          data-outside={
                            day().getMonth() !== ctx.month.getMonth()
                              ? ''
                              : undefined
                          }
                        >
                          {day().getDate()}
                        </Calendar.CellTrigger>
                      </Calendar.Cell>
                    )}
                  </Index>
                </tr>
              )}
            </Index>
          </tbody>
        </Calendar.Table>
      </Show>

      <Show when={view() === 'month'}>
        <MonthGrid
          selected={selectedMonth(ctx)}
          disabled={
            monthOnly()
              ? i => monthDisabled(ctx.month.getFullYear(), i)
              : undefined
          }
          onPick={i => {
            const picked = new Date(ctx.month.getFullYear(), i, 1);
            ctx.setMonth(picked);
            // Month-only: the grid holds the field's value, so a pick selects
            // the month's 1st; otherwise it navigates to the month's days
            if (props.mode !== 'range' && props.monthOnly)
              props.onSelect(picked);
            else setView('day');
          }}
        />
      </Show>

      <Show when={view() === 'year'}>
        <YearGrid
          pageStart={yearBase()}
          selected={ctx.month.getFullYear()}
          onPick={yr => {
            ctx.setMonth(new Date(yr, ctx.month.getMonth()));
            setView('month');
          }}
        />
      </Show>
    </div>
  );

  return (
    <>
      {props.mode === 'range' ? (
        <Calendar
          mode="range"
          value={props.value}
          onValueChange={range => props.onSelect(range)}
          month={month()}
          onMonthChange={setMonth}
          disabled={disabled}
          required={props.required}
        >
          {ctx => body(ctx)}
        </Calendar>
      ) : (
        <Calendar
          mode="single"
          value={props.value}
          onValueChange={date => props.onSelect(date)}
          month={month()}
          onMonthChange={setMonth}
          disabled={disabled}
          required={props.required}
        >
          {ctx => body(ctx)}
        </Calendar>
      )}
    </>
  );
};
