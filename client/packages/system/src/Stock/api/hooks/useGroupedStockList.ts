import {
  ItemSortFieldInput,
  SortBy,
  StockLineFilterInput,
  keepPreviousData,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineListRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

// Only a subset of stock-line filters apply in grouped mode — the Toolbar
// hides location/expiry/VVM filters when grouping is active. masterList is an
// item-level filter so it stays available; the rest is what the Toolbar
// exposes when grouped.
type GroupedFilterBy = Pick<
  StockLineFilterInput,
  'search' | 'name' | 'code' | 'masterList'
>;

export type GroupedStockListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockLineListRowFragment>;
  filterBy?: GroupedFilterBy;
};

export const useGroupedStockList = (
  queryParams: GroupedStockListParams,
  options?: { enabled?: boolean }
) => {
  const { stockApi, storeId } = useStockGraphQL();

  const {
    sortBy = {
      key: 'name',
      direction: 'asc',
      isDesc: false,
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [
    STOCK,
    storeId,
    LIST,
    'grouped',
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: StockLineListRowFragment[];
    totalCount: number;
  }> => {
    // hasPacksInStore: true is the parity-guaranteeing predicate — items
    // appear here iff at least one of their stock lines would appear in the
    // non-aggregated `stockLines` query (which uses the same predicate).
    const filter: StockLineFilterInput = {
      hasPacksInStore: true,
      ...(filterBy?.search ? { search: filterBy.search } : {}),
      ...(filterBy?.name ? { name: filterBy.name } : {}),
      ...(filterBy?.code ? { code: filterBy.code } : {}),
      ...(filterBy?.masterList ? { masterList: filterBy.masterList } : {}),
    };

    const query = await stockApi.itemsByStockLineFilter({
      storeId,
      first,
      offset,
      key: toItemSortField(sortBy),
      desc: sortBy.isDesc,
      filter,
    });

    const items = query?.itemsByStockLineFilter;
    if (!items || !('nodes' in items)) return { nodes: [], totalCount: 0 };

    // Flatten: items with nested stock lines → flat stock line array.
    // MRT's column grouping handles the visual grouping + aggregation.
    const nodes: StockLineListRowFragment[] = [];
    for (const item of items.nodes) {
      for (const stockLine of item.availableBatches.nodes) {
        nodes.push(stockLine);
      }
    }

    return { nodes, totalCount: items.totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });

  return query;
};

const toItemSortField = (
  sortBy: SortBy<StockLineListRowFragment>
): ItemSortFieldInput => {
  const sortFieldMap: Record<string, ItemSortFieldInput> = {
    name: ItemSortFieldInput.Name,
    code: ItemSortFieldInput.Code,
  };

  return sortFieldMap[sortBy.key] ?? ItemSortFieldInput.Name;
};
