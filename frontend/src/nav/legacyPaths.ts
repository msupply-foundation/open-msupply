// Addresses that used to name a screen, mapped to the address that names it
// now. A rename that moves a path leaves bookmarks, shared links, printed URLs
// and already-built plugin deep links pointing at the old one; without an
// answer here they fall through to the not-found catch-all, which is a worse
// reply than the screen the user asked for.
//
// Kept as pure functions so the mapping is testable on its own — the Route
// components in App.tsx are the thin wiring around them.

/**
 * The dispensing vertical moved from `dispensary/prescription` to
 * `dispensary/dispensing` when it was relabelled "Dispensing" (issue #551),
 * "Prescriptions" having passed to the prescriber's side. `rest` is whatever
 * followed the old segment — an invoice id, and possibly an item id after it —
 * and is carried across untouched, so a link to a specific record still lands
 * on that record rather than on the list.
 */
export const dispensingHref = (storeId: string, rest?: string): string =>
  `/${storeId}/dispensary/dispensing${rest ? `/${rest}` : ''}`;
