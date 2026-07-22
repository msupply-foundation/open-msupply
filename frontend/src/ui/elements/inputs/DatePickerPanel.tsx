import Calendar from '@corvu/calendar';
import {
  createEffect,
  createSignal,
  For,
  Index,
  on,
  Show,
  type JSX,
} from 'solid-js';
import { ChevronLeftIcon, ChevronRightIcon } from '../../icons';
import { dateToIsoDate } from './dateTimeConvert';
import { locale } from '../../../intl';
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
} & (
  | {
      mode?: 'single';
      value: Date | null;
      /** Picked local date, or null when deselected. */
      onSelect: (date: Date | null) => void;
    }
  | {
      mode: 'range';
      value: DateRange;
      /** The (partial) range as the user picks from/to. */
      onSelect: (range: DateRange) => void;
    }
);

/** The corvu render-prop fields this panel reads (single and range share them). */
interface CalendarCtx {
  month: Date;
  setMonth: (month: Date) => void;
  weekdays: Date[];
  weeks: Date[][];
}

const YEARS_PER_PAGE = 16;

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
  const [view, setView] = createSignal<'day' | 'month' | 'year'>('day');
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
        return d ? dateToIsoDate(d) : '';
      },
      () => {
        const d = focusDate();
        if (d) setMonth(d);
      }
    )
  );

  const monthShort = (i: number) =>
    new Date(2000, i, 1).toLocaleDateString(locale(), { month: 'short' });

  const disabled = (day: Date): boolean => {
    if (props.min && dateToIsoDate(day) < dateToIsoDate(props.min)) return true;
    if (props.max && dateToIsoDate(day) > dateToIsoDate(props.max)) return true;
    return false;
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
              {ctx.month.toLocaleDateString(locale(), { month: 'long' })}
            </button>
            <button
              type="button"
              class={styles.headingBtn}
              onClick={() => {
                setYearBase(y() - (y() % YEARS_PER_PAGE));
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
              setYearBase(y() - (y() % YEARS_PER_PAGE));
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
        <div class={styles.pickGrid}>
          <Index each={Array.from({ length: 12 }, (_, i) => i)}>
            {i => (
              <button
                type="button"
                class={styles.pickCell}
                data-selected={ctx.month.getMonth() === i() ? '' : undefined}
                onClick={() => {
                  ctx.setMonth(new Date(ctx.month.getFullYear(), i()));
                  setView('day');
                }}
              >
                {monthShort(i())}
              </button>
            )}
          </Index>
        </div>
      </Show>

      <Show when={view() === 'year'}>
        <div class={styles.pickGrid}>
          <For
            each={Array.from(
              { length: YEARS_PER_PAGE },
              (_, i) => yearBase() + i
            )}
          >
            {yr => (
              <button
                type="button"
                class={styles.pickCell}
                data-selected={ctx.month.getFullYear() === yr ? '' : undefined}
                onClick={() => {
                  ctx.setMonth(new Date(yr, ctx.month.getMonth()));
                  setView('month');
                }}
              >
                {yr}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );

  return props.mode === 'range' ? (
    <Calendar
      mode="range"
      value={props.value}
      onValueChange={range => props.onSelect(range)}
      month={month()}
      onMonthChange={setMonth}
      disabled={disabled}
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
    >
      {ctx => body(ctx)}
    </Calendar>
  );
};
