import { graphqlFetch } from '../../api/graphql';
import { ItemPrograms, type ItemProgramsResult } from './itemPrograms.generated';

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
