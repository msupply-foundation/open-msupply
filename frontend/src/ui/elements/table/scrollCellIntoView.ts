/*
 * Scroll a control inside a DataTable into view by its CELL.
 *
 * In table view the whole <td> is the target: its padding, and the column
 * header above it, land clear of the pinned columns (the scroll box reserves
 * the frozen blocks as scroll padding — see DataTable's frozenWidths). The
 * control alone is the wrong target there: it can sit behind leading chrome
 * (a combobox's search icon), so lining IT up with the frozen edge leaves the
 * control's own start — and the cell's message line — under the pinned block.
 *
 * A card has no per-field cell (the whole card is one <td>), so in card view
 * the control itself scrolls. The view is read off the nearest table's scroll
 * box (data-view), not the nearest `[data-view="table"]` anywhere up the tree,
 * so a card-view table rendered inside a table-view one still scrolls its
 * field.
 */
export const scrollCellIntoView = (
  el: HTMLElement,
  options: ScrollIntoViewOptions
): void => {
  const cell = el.closest('td');
  const tableView =
    cell?.closest('[data-view]')?.getAttribute('data-view') === 'table';
  (tableView && cell ? cell : el).scrollIntoView(options);
};
