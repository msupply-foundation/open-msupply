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

/**
 * A heading plus its items — what Kobalte reads as a SECTION once
 * `optionGroupChildren` names the `options` key.
 */
export type Section<T> = { label: string; options: T[] };

/**
 * The heading of the section holding the PINNED items — empty, because that
 * tier has no name: it is simply what comes before the groups. It has to be a
 * section at all only because Kobalte will not mix bare options with sections
 * (see {@link sectionOptions}); `.section:empty` renders it as nothing.
 */
export const PINNED_SECTION = '';

/*
 * Group a flat option list into Kobalte sections (Combobox's `itemGroup`).
 *
 * EVERY node must be a section: Kobalte reads `optionGroupChildren` off each
 * top-level node without checking it is there, so a bare option sitting beside
 * a section throws on the missing array. The items the caller leaves ungrouped
 * therefore go into one empty-headed section of their own, always first.
 *
 * Groups bucket IN FIRST-SEEN ORDER, so the caller's own item order decides how
 * the headings fall rather than an alphabetical sort nobody asked for. A
 * section with no items is never built, so a group whose items were all
 * filtered away takes its heading with it.
 */
export const sectionOptions = <T>(
  items: T[],
  group: (item: T) => string | undefined
): Section<T>[] => {
  const sections = new Map<string, T[]>([[PINNED_SECTION, []]]);
  for (const item of items) {
    const label = group(item) ?? PINNED_SECTION;
    const bucket = sections.get(label);
    if (bucket) bucket.push(item);
    else sections.set(label, [item]);
  }
  return [...sections]
    .filter(([, bucket]) => bucket.length > 0)
    .map(([label, bucket]) => ({ label, options: bucket }));
};

/** The slice of a Kobalte collection node {@link firstMatchKey} reads. */
export interface OptionNode<T> {
  type: 'item' | 'section';
  key: string;
  rawValue: T;
  disabled: boolean;
}

/**
 * The option to highlight once the user has typed: the first one Enter could
 * actually pick. Sections are headings, not options, and a disabled option
 * can't be chosen, so both are passed over. `skip` drops options that are
 * listed but aren't a MATCH for what was typed (see {@link skipsHighlight}).
 *
 * Undefined when nothing qualifies: highlighting nothing leaves Enter inert,
 * which beats committing an option the user never asked for.
 */
export const firstMatchKey = <T>(
  nodes: Iterable<OptionNode<T>>,
  skip?: (item: T) => boolean
): string | undefined => {
  for (const node of nodes) {
    if (node.type !== 'item' || node.disabled) continue;
    if (skip?.(node.rawValue)) continue;
    return node.key;
  }
  return undefined;
};

/**
 * Whether a listed row is passed over by the first-match highlight: it is on
 * screen without answering the query.
 * - The committed selection (`held`): a server-mode caller holding a controlled
 *   value lists it first whatever is typed (AsyncCombobox's seed), so it would
 *   always win, and re-picking it changes nothing — Enter would look dead with
 *   the query still in the box. A selection that DOES match stays eligible:
 *   skipping it would make Enter silently swap it for the next match.
 * - A `pinned` item (grouped mode): listed whatever is typed, so highlighting
 *   it would make Enter choose "None" over the row the user was typing
 *   towards. One the user typed by name is fair game.
 */
export const skipsHighlight = (row: {
  held: boolean;
  pinned: boolean;
  matchesQuery: boolean;
}): boolean => (row.held || row.pinned) && !row.matchesQuery;

/**
 * The key the highlight should move to, or undefined to leave it be.
 *
 * Nothing moves without a query (see HighlightFirstMatch). A highlight still
 * listed is the user's own — arrowed or hovered to — and is kept, UNLESS the
 * query has just changed and it sits on a skipped row: Kobalte highlights the
 * committed selection when the picker reopens, and typing over it doesn't
 * always clear that before the results land, so a quick type-and-Enter
 * re-picked the item already held. Arrowing onto such a row leaves the query
 * as it was, so the highlight stays where the user put it.
 */
export const nextHighlightKey = <T>(state: {
  query: string;
  queryChanged: boolean;
  nodes: Iterable<OptionNode<T>> & {
    getItem(key: string): OptionNode<T> | undefined;
  };
  focused: string | null | undefined;
  skip?: (item: T) => boolean;
}): string | undefined => {
  if (state.query.trim() === '') return undefined;
  const node =
    state.focused == null ? undefined : state.nodes.getItem(state.focused);
  if (node && !(state.queryChanged && state.skip?.(node.rawValue)))
    return undefined;
  const key = firstMatchKey(state.nodes, state.skip);
  return key === state.focused ? undefined : key;
};
