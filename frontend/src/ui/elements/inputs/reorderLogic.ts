/*
 * The order arithmetic behind ReorderableList — pure, so the two gestures that
 * produce an order (a drag crossing a row, a move button) are one tested
 * function each rather than index maths inlined in event handlers.
 */

/** `ids` with `id` moved to `index`; unchanged where `id` is absent. */
export const reorderBy = (
  ids: readonly string[],
  id: string,
  index: number
): string[] => {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const rest = ids.filter(other => other !== id);
  const to = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, to), id, ...rest.slice(to)];
};

/** `ids` with `id` moved one step, or all the way, in one direction. */
export const moveTo = (
  ids: readonly string[],
  id: string,
  to: 'top' | 'up' | 'down' | 'bottom'
): string[] => {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const index =
    to === 'top'
      ? 0
      : to === 'bottom'
        ? ids.length - 1
        : to === 'up'
          ? from - 1
          : from + 1;
  return reorderBy(ids, id, index);
};

/** The row fields a stabilised identity is held against. */
interface Lines {
  id: string;
  label: string;
  description?: string;
}

/**
 * `next`, with every item whose lines are unchanged replaced by the object of
 * the same id from `held` — so a parent that rebuilds its items on each reorder
 * still hands the list the SAME references in a new order. Returns the map to
 * pass back as `held` next time, which drops the ids that have left.
 */
export const keepIdentities = <T extends Lines>(
  held: ReadonlyMap<string, T>,
  next: readonly T[]
): { items: T[]; held: Map<string, T> } => {
  const items = next.map(item => {
    const previous = held.get(item.id);
    return previous &&
      previous.label === item.label &&
      previous.description === item.description
      ? previous
      : item;
  });
  return { items, held: new Map(items.map(item => [item.id, item])) };
};
