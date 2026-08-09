import type { ItemsListFilter } from '@/sections/items/list/itemFilter';

// Selecting a master list opens the ITEMS list scoped to it (spec/DIVERGENCES
// D80, issue #776) — the richer view of the same membership fact, with
// drill-down into each item, replacing the read-only detail screen this
// vertical used to own.
//
// Same shape as the dashboard's stat links (sections/dashboard/statLinks.ts):
// this vertical owns WHAT the link filters by; the target list owns the URL
// encoding — the shared `?query=` JSON param (kdd/url-structure) — and the
// filter object conforms to the items list's OWN filter contract via a
// type-only import, so a drift there stops compiling here (kdd/type-safety).

const ITEMS_PATH = 'catalogue/items';

export const itemsForMasterListHref = (
  storeId: string,
  masterListId: string
): string => {
  const filter = {
    masterListId,
    // The items list SEEDS its search chip with `codeOrName: null`
    // (ItemsList DEFAULT_STATE), and useUrlQueryState merges the URL's state
    // SHALLOWLY over the defaults — so a `filter` in the URL replaces the whole
    // default filter object. Carrying the seed keeps the search chip present on
    // arrival, exactly as it is when the list is opened from the nav.
    codeOrName: null,
  } satisfies ItemsListFilter;
  return `/${storeId}/${ITEMS_PATH}?query=${encodeURIComponent(
    JSON.stringify({ filter })
  )}`;
};
