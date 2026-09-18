import type { JSX } from 'solid-js';
import styles from './Table.module.css';

export interface TableProps {
  /**
   * Accessible name for the table — what the data is ("Outbound shipments").
   */
  label: string;
  /** The <thead>/<tbody>, composed by the page. */
  children: JSX.Element;
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
export const Table = (props: TableProps) => (
  <div class={styles.wrap}>
    <table class={styles.table} aria-label={props.label}>
      {props.children}
    </table>
  </div>
);
