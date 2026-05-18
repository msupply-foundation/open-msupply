import {
  SortBy,
  StockLineFilterInput,
  StockLineSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

export type StockListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockLineRowFragment>;
  filterBy?: StockLineFilterInput;
};

export const useStockList = (
  queryParams: StockListParams,
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

  const query = useQuery({
    queryKey,
    queryFn,

    keepPreviousData: true,
    enabled: options?.enabled,
  });
  return query;
};

const toSortField = (
  sortBy: SortBy<StockLineRowFragment>
): StockLineSortFieldInput => {
  const sortFieldMap: Record<string, StockLineSortFieldInput> = {
    batch: StockLineSortFieldInput.Batch,
    code: StockLineSortFieldInput.ItemCode,
    name: StockLineSortFieldInput.ItemName,
    packSize: StockLineSortFieldInput.PackSize,
    supplierName: StockLineSortFieldInput.SupplierName,
    totalNumberOfPacks: StockLineSortFieldInput.NumberOfPacks,
    'location.code': StockLineSortFieldInput.LocationCode,
    costPricePerPack: StockLineSortFieldInput.CostPricePerPack,
    expiryDate: StockLineSortFieldInput.ExpiryDate,
    manufactureDate: StockLineSortFieldInput.ManufactureDate,
  };

  return sortFieldMap[sortBy.key] ?? StockLineSortFieldInput.ItemName;
};
