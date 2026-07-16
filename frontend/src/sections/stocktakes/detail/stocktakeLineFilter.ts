import type { StocktakeLineFragment } from './lines/stocktakeDetail.generated';

// Client-side filtering of the already-loaded stocktake lines (the whole
// stocktake loads at once, so there's no server round-trip — matching Open
// mSupply, which filters the loaded rows in memory). The filter object is a
// plain flat shape (NOT a GraphQL filter — these lines never go back to the
// server as a query), consumed by FilterBar the same way: a key present = an
// active chip, absent = not added. `search` is the always-on item search (name
// OR code, like OMS); `errorIds` is the special errors-only filter the error
// dialog switches on (only meaningful when there ARE error lines).

export interface StocktakeLineFilter {
  /**
   * Always-on free text — matches item name OR code (case-insensitive
   * substring), like OMS.
   */
  search?: string;
  batch?: string;
  /** ISO date (yyyy-mm-dd) — keep lines expiring strictly before this. */
  expiryBefore?: string;
  location?: string;
  /**
   * Item name/code substring (a narrower, explicitly-added twin of `search`).
   */
  item?: string;
  /**
   * When present, keep ONLY lines whose id is in this set (the errors-only
   * filter).
   */
  errorIds?: string[];
}

const includesCI = (
  haystack: string | null | undefined,
  needle: string
): boolean => (haystack ?? '').toLowerCase().includes(needle.toLowerCase());

// Does a line pass every active filter? An absent/empty key is inactive
// (doesn't constrain).
export const lineMatchesFilter = (
  line: StocktakeLineFragment,
  filter: StocktakeLineFilter
): boolean => {
  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim();
    if (!includesCI(line.itemName, q) && !includesCI(line.item.code, q))
      return false;
  }
  if (filter.item && filter.item.trim()) {
    const q = filter.item.trim();
    if (!includesCI(line.itemName, q) && !includesCI(line.item.code, q))
      return false;
  }
  if (filter.batch && filter.batch.trim()) {
    if (!includesCI(line.batch, filter.batch.trim())) return false;
  }
  if (filter.location && filter.location.trim()) {
    const q = filter.location.trim();
    if (
      !includesCI(line.location?.code, q) &&
      !includesCI(line.location?.name, q)
    )
      return false;
  }
  if (filter.expiryBefore) {
    // A line with no expiry never satisfies an "expiring before" bound.
    if (!line.expiryDate || line.expiryDate >= filter.expiryBefore)
      return false;
  }
  if (filter.errorIds) {
    if (!filter.errorIds.includes(line.id)) return false;
  }
  return true;
};
