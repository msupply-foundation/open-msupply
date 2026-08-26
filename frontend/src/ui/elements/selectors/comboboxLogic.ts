/*
 * Combobox's two list rules — what the widget is SEARCHING for, and which of a
 * client-mode caller's items are actually MOUNTED. Pure and outside the
 * component so both are testable without a DOM (as filterBarLogic is for
 * FilterBar, and numberFieldLogic for NumberField); Combobox is the only
 * caller.
 */

/**
 * The text the combobox is searching for, given what its input holds.
 *
 * The input serves two masters: it is where the user types a query, and it is
 * where the widget shows the committed selection's label. Only the first is a
 * search. Kobalte owns that text and rewrites it from the selection whenever
 * the selection (re)emits — on a pick, and on any external change to the
 * controlled value — so a label echo arrives through the very same channel as a
 * keystroke, and no amount of history-keeping reliably tells them apart.
 *
 * So the rule is about what the text IS, not where it came from: text that is
 * the committed selection's own label searches for nothing. A picker reopened
 * on a selection therefore offers the full list to choose from again, rather
 * than searching for a label the source can't match — which for a server-backed
 * lookup fetched no rows at all, leaving the already-selected item as the only
 * thing on offer (#985).
 *
 * Typing that exact label by hand lands in the same place. Accepted, and the
 * honest reading: what has been asked for is already selected.
 */
export const typedQuery = <T>(
  input: string,
  selected: T | null | undefined,
  labelOf: (item: T) => string
): string => (selected == null || input !== labelOf(selected) ? input : '');

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
