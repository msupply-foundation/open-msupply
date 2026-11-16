import { For, Index } from 'solid-js';
import { locale } from '../../../intl';
import styles from './DatePickerPanel.module.css';

/** Years shown per page of the year grid. */
export const YEARS_PER_PAGE = 16;

/** The first year of the page of the year grid that holds `year`. */
export const yearPageStart = (year: number): number =>
  year - (year % YEARS_PER_PAGE);

const COLUMNS = 4;

/*
 * Arrow keys move focus around a 4-column pick grid (Home/End to its ends),
 * skipping nothing: a disabled cell can't take focus, so focus stops on the
 * nearest enabled one in that direction, or stays put at the edge. Left and
 * right follow the reading direction, so in RTL (Arabic) the arrow pointing
 * to the next cell is ←.
 */
const moveFocus = (e: KeyboardEvent) => {
  const grid = e.currentTarget as HTMLElement;
  const forward =
    getComputedStyle(grid).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const back = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
  const step =
    e.key === forward
      ? 1
      : e.key === back
        ? -1
        : e.key === 'ArrowDown'
          ? COLUMNS
          : e.key === 'ArrowUp'
            ? -COLUMNS
            : undefined;
  const cells = Array.from(grid.querySelectorAll('button'));
  const from = cells.indexOf(document.activeElement as HTMLButtonElement);
  if (from === -1) return;
  let to: number | undefined;
  if (e.key === 'Home') to = cells.findIndex(c => !c.disabled);
  else if (e.key === 'End')
    to = cells.length - 1 - [...cells].reverse().findIndex(c => !c.disabled);
  else if (step !== undefined) {
    for (let i = from + step; i >= 0 && i < cells.length; i += step) {
      if (!cells[i]!.disabled) {
        to = i;
        break;
      }
    }
  }
  if (to === undefined && step === undefined) return;
  e.preventDefault();
  if (to !== undefined && to >= 0) cells[to]!.focus();
};

export interface MonthGridProps {
  /** The highlighted month, 0–11, or undefined for none. */
  selected?: number;
  onPick: (month: number) => void;
  /** A month that can't be picked (outside the field's bounds). */
  disabled?: (month: number) => boolean;
}

/**
 * The twelve months of a year, as a 4 × 3 grid of buttons — the date picker's
 * month view and MonthField's whole panel.
 */
export const MonthGrid = (props: MonthGridProps) => {
  // Month names are always Gregorian, the calendar the grid lays out: left
  // to the browser, Dari and Pashto would name Solar Hijri months.
  const monthShort = (i: number) =>
    new Date(2000, i, 1).toLocaleDateString(locale(), {
      month: 'short',
      calendar: 'gregory',
    });
  return (
    <div class={styles.pickGrid} onKeyDown={moveFocus}>
      <Index each={Array.from({ length: 12 }, (_, i) => i)}>
        {i => (
          <button
            type="button"
            class={styles.pickCell}
            data-selected={props.selected === i() ? '' : undefined}
            aria-pressed={props.selected === i()}
            disabled={props.disabled?.(i())}
            onClick={() => props.onPick(i())}
          >
            {monthShort(i())}
          </button>
        )}
      </Index>
    </div>
  );
};

export interface YearGridProps {
  /** First year on the page (see yearPageStart). */
  pageStart: number;
  /** The highlighted year, or undefined for none. */
  selected?: number;
  onPick: (year: number) => void;
  /** A year that can't be picked (outside the field's bounds). */
  disabled?: (year: number) => boolean;
}

/** A page of YEARS_PER_PAGE years, as a 4-column grid of buttons. */
export const YearGrid = (props: YearGridProps) => (
  <div class={styles.pickGrid} onKeyDown={moveFocus}>
    <For
      each={Array.from(
        { length: YEARS_PER_PAGE },
        (_, i) => props.pageStart + i
      )}
    >
      {yr => (
        <button
          type="button"
          class={styles.pickCell}
          data-selected={props.selected === yr ? '' : undefined}
          aria-pressed={props.selected === yr}
          disabled={props.disabled?.(yr)}
          onClick={() => props.onPick(yr)}
        >
          {yr}
        </button>
      )}
    </For>
  </div>
);
