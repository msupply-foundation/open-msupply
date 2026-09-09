// Addresses that used to name a screen, mapped to the address that names it
// now. A rename that moves a path leaves bookmarks, shared links, printed URLs
// and already-built plugin deep links pointing at the old one; without an
// answer here they fall through to the not-found catch-all, which is a worse
// reply than the screen the user asked for.
//
// Kept as pure functions so the mapping is testable on its own — the Route
// components in App.tsx are the thin wiring around them.

/**
 * Everything in an address after its path: the `?query=…` that carries a list's
 * filter, sort and page (see list/urlQueryState) and any `#fragment`. Rebuilding
 * a destination from path params alone drops it, which answers a link to a
 * filtered list with the unfiltered one — so it is carried across verbatim, in
 * the leading-`?`/`#` form `useLocation` reports (both empty strings when absent,
 * which is why they need no separator).
 */
export type AddressTail = { search?: string; hash?: string };

const tail = ({ search = '', hash = '' }: AddressTail): string =>
  `${search}${hash}`;

/**
 * The dispensing vertical moved from `dispensary/prescription` to
 * `dispensary/dispensing` when it was relabelled "Dispensing" (issue #551),
 * "Prescriptions" having passed to the prescriber's side. `rest` is whatever
 * followed the old segment — an invoice id, and possibly an item id after it —
 * and is carried across untouched, so a link to a specific record still lands
 * on that record rather than on the list.
 */
export const dispensingHref = (
  storeId: string,
  rest?: string,
  address: AddressTail = {}
): string =>
  `/${storeId}/dispensary/dispensing${rest ? `/${rest}` : ''}${tail(address)}`;

/**
 * Home moved from `dashboard` to the store root (spec/navigation § the
 * registry).
 */
export const storeHomeHref = (
  storeId: string,
  address: AddressTail = {}
): string => `/${storeId}${tail(address)}`;
