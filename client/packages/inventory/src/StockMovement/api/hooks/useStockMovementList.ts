import {
  LIST_KEY,
  SortBy,
  StockRelocationFilterInput,
  StockRelocationSortFieldInput,
  useQuery,
  keepPreviousData,
} from '@openmsupply-client/common';
import { STOCK_MOVEMENT } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';
import { StockMovementRowFragment } from '../operations.generated';

export type StockMovementsParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockMovementRowFragment>;
  filterBy?: StockRelocationFilterInput | null;
};

export const useStockMovementList = (queryParams: StockMovementsParams) => {
  const { stockMovementApi, storeId } = useStockMovementGraphQL();

  const { sortBy, first, offset, filterBy } = queryParams;

  const queryKey = [
    STOCK_MOVEMENT,
    storeId,
    LIST_KEY,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: StockMovementRowFragment[];
    totalCount: number;
  }> => {
    const result = await stockMovementApi.stockRelocations({
      storeId,
      page: { offset, first },
      sort: sortBy?.key
        ? { key: toSortField(sortBy.key), desc: !!sortBy.isDesc }
        : undefined,
      filter: filterBy,
    });
    const { nodes, totalCount } = result?.stockRelocations;
    return { nodes, totalCount };
  };

  return useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  });
};

const toSortField = (
  key?: keyof StockMovementRowFragment | string
): StockRelocationSortFieldInput => {
  switch (key) {
    case 'status':
      return StockRelocationSortFieldInput.Status;
    case 'numberOfPacks':
      return StockRelocationSortFieldInput.NumberOfPacks;
    case 'itemCode':
      return StockRelocationSortFieldInput.ItemCode;
    case 'itemName':
      return StockRelocationSortFieldInput.ItemName;
    case 'batch':
      return StockRelocationSortFieldInput.Batch;
    case 'expiryDate':
      return StockRelocationSortFieldInput.ExpiryDate;
    case 'fromLocation':
      return StockRelocationSortFieldInput.FromLocation;
    case 'toLocation':
      return StockRelocationSortFieldInput.ToLocation;
    case 'finalisedDatetime':
      return StockRelocationSortFieldInput.FinalisedDatetime;
    case 'createdDatetime':
    default:
      return StockRelocationSortFieldInput.CreatedDatetime;
  }
};
