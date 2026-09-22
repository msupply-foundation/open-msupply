import { onCleanup, type JSX } from 'solid-js';
import { isNearScrollEnd } from '../../utils/createPaginatedSearch';
import styles from './Table.module.css';

export interface TableProps {
  /**
   * Accessible name for the table — what the data is ("Outbound shipments").
   */
  label: string;
  /** The <thead>/<tbody>, composed by the page. */
  children: JSX.Element;
  /**
   * Take the height the flex parent has to give and scroll the rows inside it,
   * instead of growing with them — for the one case where the row set is not
   * short after all: a sub-table fed by a PAGED read, where what is loaded
   * grows as the user scrolls. The surface around it (a dialog's search box,
   * its footer) then stays put instead of being pushed off, and no gap opens
   * under the rows when the surface is taller than they are (a dialog goes
   * full-screen on a phone). Needs a flex-column parent with a bounded height
   * — a dialog's scroll region is one. Unset, the shell grows with its rows.
   */
  fill?: boolean;
  /**
   * Called when the (bounded) shell is scrolled near its bottom — fetch the
   * next page and append rows. Same contract as the combobox listbox's
   * `onReachEnd`, on the same shared threshold: a no-op when there are no
   * more pages or a fetch is in flight, so firing per scroll event is safe.
   */
  onReachEnd?: () => void;
}

/*
 * Table — the DISPLAY SHELL only: a scroll container + a real semantic
 * <table>, styled to the app's row look (toolbar-grey header row, hairline
 * row dividers, hover + selection tints). The page composes plain
 * <thead>/<tbody> markup; there is no engine here (no sorting, pagination or
 * column state) and no toolbar or cell presets.
 *
 * WHEN TO USE IT (spec/ui-standards/components.md § Tables → the "Static
 * sub-table" role): a SHORT, FIXED row set presented INSIDE another surface —
 * a DetailCard's sub-table (the items Variants tab's packaging + bundling
 * lists), a dialog's read-only block — where DataTable's toolbar chrome
 * (filter bar, column settings, full-screen, pagination) would outweigh the
 * content. A screen's OWN row set is a DataTable however few rows it holds
 * today: the moment it wants sorting, filtering, pagination, selection or
 * column resizing, this shell is the wrong tool. Demoed on the Detail-views
 * showcase.
 *
 * Cell conventions are data attributes on the page's own markup (the same
 * styling contract Kobalte uses), not exported class names:
 *   - <th|td data-numeric>   end-aligned, tabular numerals
 *   - <th|td data-check>     narrow centred checkbox column (inputs inside
 *                            are styled; give the <th> an aria-label)
 *   - <td data-muted>        secondary text (dates, comments)
 *   - <td data-mono>         monospace (references, codes)
 *   - <tr data-selected>     selected-row tint (the checkbox carries the
 *                            state — the tint is never the only signal)
 *   - <button data-row-link> the row's opening action, as a real button in
 *                            the first data cell — keyboard-operable where a
 *                            click-only row wouldn't be
 */
export const Table = (props: TableProps) => {
  /*
   * Top up a paged shell that does not overflow. `onReachEnd` fires from a
   * scroll event, so a first page SHORTER than the box never fires one — no
   * scrollbar, no event, no page two — which is the same unreachable-rows
   * shape paging was added to avoid (PR #749 re-review). Watching the rows'
   * own box catches it: while they fit, ask for the next page. It settles
   * because the caller's loadMore is a no-op once there are no more pages,
   * and each round trip breaks the loop.
   */
  const watchFill = (wrap: HTMLDivElement) => {
    if (!props.onReachEnd) return;
    const topUp = () => {
      if (wrap.scrollHeight <= wrap.clientHeight + 1) props.onReachEnd?.();
    };
    // The ROWS are what change height as pages land — with `fill` the wrap's
    // own box is fixed by the flex parent and never moves, so observing it
    // alone would miss them. The observer delivers an initial reading of each
    // target, which covers the first page; no separate call is needed, and a
    // synchronous one here could read a box that is not laid out yet.
    const observer = new ResizeObserver(topUp);
    observer.observe(wrap);
    const rows = wrap.querySelector('table');
    if (rows) observer.observe(rows);
    onCleanup(() => observer.disconnect());
  };

  return (
    <div
      class={styles.wrap}
      data-fill={props.fill ? '' : undefined}
      ref={el => watchFill(el)}
      onScroll={event => {
        if (props.onReachEnd && isNearScrollEnd(event.currentTarget))
          props.onReachEnd();
      }}
    >
      <table class={styles.table} aria-label={props.label}>
        {props.children}
      </table>
    </div>
  );
};
