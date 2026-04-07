import {
  ItemSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

export type GroupedStockListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockLineRowFragment>;
  filterBy?: Record<string, unknown>;
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
    const filter = {
      hasStockOnHand: true,
      ...(filterBy?.['search'] ? { codeOrName: filterBy['search'] } : {}),
      ...(filterBy?.['name'] ? { codeOrName: filterBy['name'] } : {}),
      ...(filterBy?.['code'] ? { code: filterBy['code'] } : {}),
    };

    const query = await stockApi.stockItemsGrouped({
      storeId,
      first,
      offset,
      key: toItemSortField(sortBy),
      desc: sortBy.isDesc,
      filter,
    });

    const items = query?.items;
    if (!items || !('nodes' in items)) return { nodes: [], totalCount: 0 };

    // Flatten: items with nested stock lines → flat stock line array
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
    keepPreviousData: true,
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
