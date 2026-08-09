/*
 * Combobox's option-list rule: which of a client-mode caller's items are
 * actually MOUNTED. Pure and outside the component so the ordering constraint
 * below is testable without a DOM (as filterBarLogic is for FilterBar, and
 * numberFieldLogic for NumberField); Combobox is the only caller.
 */

export interface VisibleOptions<T> {
  /** The options to mount, in caller order, at most `cap` of them. */
  items: T[];
  /** How many matched IN TOTAL — i.e. before the cap. */
  total: number;
}

/**
 * The matching options, capped — filter FIRST, then take the first `cap`.
 *
 * The order is the whole point, and is why this is a named function rather than
 * a `.filter().slice()` inline: capping before filtering would cap the head of
 * the raw list, so a search could never reach an option sitting past the cap —
 * with a whole-store location list, typing a code would find nothing at all.
 * Filtering first means the cap only ever withholds options the user could
 * still narrow down to.
 *
 * `total` is the pre-cap count, returned rather than recomputed so the caller
 * can tell "nothing matched" from "more matched than we mounted" without a
 * second pass over a list that may be thousands long.
 */
export const visibleOptions = <T>(
  items: T[],
  matches: (item: T) => boolean,
  cap: number
): VisibleOptions<T> => {
  const kept: T[] = [];
  let total = 0;
  for (const item of items) {
    if (!matches(item)) continue;
    total += 1;
    if (kept.length < cap) kept.push(item);
  }
  return { items: kept, total };
};
