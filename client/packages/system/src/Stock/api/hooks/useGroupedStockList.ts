import {
  ItemSortFieldInput,
  SortBy,
  StockLineFilterInput,
  keepPreviousData,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

// Only a subset of stock-line filters apply in grouped mode — the Toolbar
// hides location/expiry/VVM/masterList filters when grouping is active. The
// search/name/code subset is what the Toolbar exposes.
type GroupedFilterBy = Pick<StockLineFilterInput, 'search' | 'name' | 'code'>;

export type GroupedStockListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockLineRowFragment>;
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
    nodes: StockLineRowFragment[];
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
    const nodes: StockLineRowFragment[] = [];
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
  sortBy: SortBy<StockLineRowFragment>
): ItemSortFieldInput => {
  const sortFieldMap: Record<string, ItemSortFieldInput> = {
    name: ItemSortFieldInput.Name,
    code: ItemSortFieldInput.Code,
  };

  return sortFieldMap[sortBy.key] ?? ItemSortFieldInput.Name;
};
