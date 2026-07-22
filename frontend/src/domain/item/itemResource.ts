import { graphqlFetch } from '../../api/graphql';
import { ItemsWithStock, type ItemsWithStockResult } from './item.generated';
import type { Page } from '../../ui/utils/createPaginatedSearch';

// One item option: the fields the search selector shows/needs. The row shows
// "code - name" and a total (Σ batch packs * packSize) + unit; id feeds the
// selection and the exclude-already-added logic.
export type ItemOption = {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
  /** Total units in store = Σ availableBatches (totalNumberOfPacks * packSize). */
  totalUnits: number;
  /** Whether the item is a vaccine — gates the doses / VVM display downstream. */
  isVaccine: boolean;
  /** The item's configured doses-per-unit — the doses-display multiplier. */
  doses: number;
};

type ItemNode = Extract<
  ItemsWithStockResult['items'],
  { __typename: 'ItemConnector' }
>['nodes'][number];

// Σ over the item's available batches of packs * packSize — the "total" shown
// in the option row (summed client-side; see item.graphql for why not a stat).
const totalUnitsOf = (node: ItemNode): number =>
  node.availableBatches.nodes.reduce(
    (sum, batch) => sum + batch.totalNumberOfPacks * batch.packSize,
    0
  );

/**
 * Fetch one page of stock items for the search selector: server-side filtered
 * by `search` (codeOrName) and excluding `excludeItemIds` (items already in the
 * caller's context, e.g. already on the stocktake). Returns the page's rows +
 * the grand total (so the caller knows when to stop paging), or undefined on a
 * failed fetch (graphqlFetch already surfaced it).
 *
 * A curried factory so the selector binds storeId + a live exclusions accessor
 * once and hands createPaginatedSearch a plain (search, offset) => Page fetcher.
 * excludeItemIds is an accessor (not a snapshot) so each fetch uses the current
 * exclusions — e.g. after "OK & next" adds an item, the next search excludes
 * it — without recreating the search primitive.
 */
/**
 * Resolve one item by id — the label restore for a picker reopened with only a
 * stored id (e.g. the report argument form re-opened from URL arguments,
 * spec/reports S3). Reuses the search operation with an id filter; undefined
 * when the id doesn't resolve (the picker just shows empty).
 */
export const fetchItemById = async (
  storeId: string,
  id: string
): Promise<ItemOption | undefined> => {
  const result = await graphqlFetch(ItemsWithStock, {
    storeId,
    filter: { id: { equalTo: id } },
    page: { first: 1 },
  });
  if (result.kind !== 'success') return undefined;
  const node = result.data.items.nodes[0];
  if (!node) return undefined;
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    unitName: node.unitName,
    totalUnits: totalUnitsOf(node),
    isVaccine: node.isVaccine,
    doses: node.doses,
  };
};

export const itemPageFetcher =
  (storeId: string, excludeItemIds: () => string[], pageSize: number) =>
  async (
    search: string,
    offset: number
  ): Promise<Page<ItemOption> | undefined> => {
    const exclude = excludeItemIds();
    const result = await graphqlFetch(ItemsWithStock, {
      storeId,
      filter: {
        type: { equalTo: 'STOCK' },
        isActive: true,
        isVisible: true,
        ...(search ? { codeOrName: { like: search } } : {}),
        ...(exclude.length ? { id: { notEqualAll: exclude } } : {}),
      },
      // Sort by item name ascending — stable across pages so infinite scroll
      // doesn't reshuffle rows as new pages append.
      sort: [{ key: 'name', desc: false }],
      page: { first: pageSize, offset },
    });
    if (result.kind !== 'success') return undefined;

    const { items } = result.data;
    return {
      nodes: items.nodes.map(node => ({
        id: node.id,
        code: node.code,
        name: node.name,
        unitName: node.unitName,
        totalUnits: totalUnitsOf(node),
        isVaccine: node.isVaccine,
        doses: node.doses,
      })),
      totalCount: items.totalCount,
    };
  };
