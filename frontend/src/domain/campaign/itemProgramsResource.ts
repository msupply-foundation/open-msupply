import { graphqlFetch } from '../../api/graphql';
import {
  ItemPrograms,
  type ItemProgramsResult,
} from './itemPrograms.generated';

// One program node (id + name) available for an item in the current store —
// the program side of the campaign-or-program picker.
export type ItemProgram = ItemProgramsResult['programs']['nodes'][number];

// Fetch the programs available for one item in the store. Unlike campaigns (a
// store-wide cache), programs are narrowed by item, so this is a plain per-item
// fetch — the picker drives it from a createResource keyed on the item id, so
// it re-runs when the edited item changes. Returns [] on a failed/empty fetch.
export const fetchItemPrograms = async (
  storeId: string,
  itemId: string
): Promise<ItemProgram[]> => {
  const result = await graphqlFetch(ItemPrograms, { storeId, itemId });
  return result.kind === 'success' ? result.data.programs.nodes : [];
};

/** What {@link fetchSharedItemPrograms} found for a set of items. */
export interface SharedItemPrograms {
  /** The programs every one of the items is in. */
  programs: ItemProgram[];
  /**
   * Some item is in a program the others are not, so this list is shorter than
   * that item's own would be — what lets the field SAY why a program the user
   * expected is missing, rather than leaving a short list unexplained.
   */
  narrowed: boolean;
}

/**
 * The programs EVERY one of these items is in — one item's own list when there
 * is one item, what they share when there are several.
 *
 * The intersection, not the union: a bulk pick is written to every selected
 * line, so a program only some of the items are in would record something
 * untrue of the rest. No shared program is an honest empty list.
 *
 * Items repeat across lines (several batches of one item), so the fetch is per
 * DISTINCT item — the request count follows the items, not the selection.
 * Order comes from the first item's list, which the query sorts by name.
 */
export const fetchSharedItemPrograms = async (
  storeId: string,
  itemIds: readonly string[]
): Promise<SharedItemPrograms> => {
  const distinct = [...new Set(itemIds)];
  if (distinct.length === 0) return { programs: [], narrowed: false };
  const [first = [], ...rest] = await Promise.all(
    distinct.map(itemId => fetchItemPrograms(storeId, itemId))
  );
  const programs = rest.reduce((shared, perItem) => {
    const ids = new Set(perItem.map(p => p.id));
    return shared.filter(p => ids.has(p.id));
  }, first);
  // Every per-item list CONTAINS the intersection, so a longer one is an item
  // carrying a program the rest do not.
  return {
    programs,
    narrowed: [first, ...rest].some(
      perItem => perItem.length > programs.length
    ),
  };
};
