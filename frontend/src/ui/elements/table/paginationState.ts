/** Which face the pagination footer shows — see `paginationState`. */
export type PaginationState = 'hidden' | 'full';

/** The part of `PaginationProps` the rule below reads (structurally satisfied
 * by the full props object). */
export interface PaginationExtent {
  offset: number;
  pageSize: number;
  total: number;
}

/*
 * The footer's state for a given extent (spec/ui-standards § tables →
 * pagination).
 *
 * The bar is the pager and nothing else — no range, no rows-per-page (that
 * moved to the table's settings popover) — so with a single page there is
 * nothing for it to say: every control in it navigates, and there is nowhere
 * to navigate. It is not rendered, and the host drops the band with it, so the
 * height goes to the rows. No opt-in: a one-page pager is dead weight on every
 * table, not only the ones that asked.
 *
 * A pure rule in its own module because the 'hidden' state is not the pager's
 * alone to honour — DataTable draws the footer BAND (border, padding,
 * min-height) and reads this to drop it — and importing that from the
 * component would pull the Select/Kobalte graph into a table's module, and
 * into this rule's unit test.
 *
 * The single-page test requires offset 0 as well. A URL carrying a stale offset
 * (a shared link, or rows deleted since) would otherwise strand the user on a
 * past-the-end page with no pager to get back to page 1.
 */
export const paginationState = (extent: PaginationExtent): PaginationState =>
  extent.total <= extent.pageSize && extent.offset === 0 ? 'hidden' : 'full';
