/** Which face the pagination footer shows — see `paginationState`. */
export type PaginationState = 'hidden' | 'full';

/** The part of `PaginationProps` the rule below reads (structurally satisfied
 * by the full props object). */
export interface PaginationExtent {
  offset: number;
  pageSize: number;
  total: number;
  conditional?: boolean;
}

/*
 * The footer's state for a given extent (spec/ui-standards § tables →
 * pagination).
 *
 * Without `conditional` the answer is always 'full': the bar is stable chrome,
 * rendered at any row count including zero ("0–0 of 0"), as in the current app.
 * With it, the bar earns its space — it exists only when there is somewhere to
 * page to. No rows, or one page of them, and there is no footer at all: every
 * control in it navigates, the rows are all on screen already, and the space
 * goes to the table instead.
 *
 * A pure rule in its own module for two reasons: the 'hidden' state is not the
 * pager's alone to honour — DataTable draws the footer BAR (border, padding,
 * min-height), so it reads this to drop the band along with the pager, and
 * importing that from the component would pull the whole Select/Kobalte graph
 * into a table's module (and into this rule's unit test).
 *
 * The single-page test requires offset 0 as well. A URL carrying a stale offset
 * (a shared link, or rows deleted since) would otherwise strand the user on a
 * past-the-end page with no pager to get back to page 1.
 */
export const paginationState = (extent: PaginationExtent): PaginationState => {
  if (!extent.conditional) return 'full';
  if (extent.total <= extent.pageSize && extent.offset === 0) return 'hidden';
  return 'full';
};
