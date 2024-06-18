import {
  FilterByWithBoolean,
  SortBy,
  StockLineNode,
  StockLineSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockLineRowFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export const useStockList = (queryParams: ListParams) => {
  const { stockApi, storeId } = useStockGraphQL();

  const {
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [STOCK, storeId, LIST, sortBy, first, offset, filterBy];
  const queryFn = async (): Promise<{
    nodes: StockLineRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      hasPacksInStore: true,
    };
    const query = await stockApi.stockLines({
      storeId,
      first: first,
      offset: offset,
      key: toSortField(sortBy),
      desc: sortBy.isDesc,
      filter,
    });
    const { nodes, totalCount } = query?.stockLines;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};

const toSortField = (
  sortBy: SortBy<StockLineNode>
): StockLineSortFieldInput => {
  switch (sortBy.key) {
    case 'batch':
      return StockLineSortFieldInput.Batch;
    case 'itemCode':
      return StockLineSortFieldInput.ItemCode;
    case 'itemName':
      return StockLineSortFieldInput.ItemName;
    case 'packSize':
      return StockLineSortFieldInput.PackSize;
    case 'supplierName':
      return StockLineSortFieldInput.SupplierName;
    case 'numberOfPacks':
      return StockLineSortFieldInput.NumberOfPacks;
    case 'location':
      return StockLineSortFieldInput.LocationCode;
    case 'expiryDate':
    default: {
      return StockLineSortFieldInput.ExpiryDate;
    }
  }
};
