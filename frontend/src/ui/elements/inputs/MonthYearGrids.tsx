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
 *
 * The cell `key` moves focus to from cell `from`, given which cells are
 * disabled: its index, `null` for a navigation key that has nowhere to go
 * (focus stays put), or `undefined` for a key the grid doesn't handle.
 */
export const pickGridTarget = (
  key: string,
  from: number,
  disabled: readonly boolean[],
  rtl: boolean
): number | null | undefined => {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (key === 'Home') {
    const to = disabled.findIndex(d => !d);
    return to === -1 ? null : to;
  }
  if (key === 'End') {
    const to = disabled.findLastIndex(d => !d);
    return to === -1 ? null : to;
  }
  const step =
    key === forward
      ? 1
      : key === back
        ? -1
        : key === 'ArrowDown'
          ? COLUMNS
          : key === 'ArrowUp'
            ? -COLUMNS
            : undefined;
  if (step === undefined) return undefined;
  for (let i = from + step; i >= 0 && i < disabled.length; i += step) {
    if (!disabled[i]) return i;
  }
  return null;
};

const moveFocus = (e: KeyboardEvent) => {
  const grid = e.currentTarget as HTMLElement;
  const cells = Array.from(grid.querySelectorAll('button'));
  const from = cells.indexOf(document.activeElement as HTMLButtonElement);
  if (from === -1) return;
  const to = pickGridTarget(
    e.key,
    from,
    cells.map(c => c.disabled),
    getComputedStyle(grid).direction === 'rtl'
  );
  if (to === undefined) return;
  e.preventDefault();
  if (to !== null) cells[to]!.focus();
};

/**
 * A month cell's aria-pressed: "true" on the picked month when the grid holds
 * the field's value, and absent otherwise — a navigation grid's cells are
 * plain buttons, not toggles.
 */
export const monthCellPressed = (
  holdsValue: boolean | undefined,
  isSelected: boolean
): 'true' | undefined => (holdsValue && isSelected ? 'true' : undefined);

export interface MonthGridProps {
  /** The highlighted month, 0–11, or undefined for none. */
  selected?: number;
  onPick: (month: number) => void;
  /** A month that can't be picked (outside the field's bounds). */
  disabled?: (month: number) => boolean;
  /**
   * The grid holds the field's value (a month-only field), not just
   * navigation: the picked month is then announced as pressed, so it isn't
   * signalled by colour alone (ui/CLAUDE.md 9).
   */
  holdsValue?: boolean;
}

/**
 * The twelve months of a year, as a 4 × 3 grid of buttons — the date picker's
 * month view, and a month-only DateField's whole panel.
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
            aria-pressed={monthCellPressed(
              props.holdsValue,
              props.selected === i()
            )}
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
          disabled={props.disabled?.(yr)}
          onClick={() => props.onPick(yr)}
        >
          {yr}
        </button>
      )}
    </For>
  </div>
);
