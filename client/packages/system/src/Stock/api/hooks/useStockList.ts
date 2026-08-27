import {
  SortBy,
  StockLineFilterInput,
  StockLineSortFieldInput,
  useQuery,
  keepPreviousData,
} from '@openmsupply-client/common';
import { StockLineListRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

export type StockListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StockLineListRowFragment>;
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
    nodes: StockLineListRowFragment[];
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

    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
  return query;
};

const toSortField = (
  sortBy: SortBy<StockLineListRowFragment>
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
    sellPricePerPack: StockLineSortFieldInput.SellPricePerPack,
    expiryDate: StockLineSortFieldInput.ExpiryDate,
    manufactureDate: StockLineSortFieldInput.ManufactureDate,
    campaign: StockLineSortFieldInput.Campaign,
  };

  return sortFieldMap[sortBy.key] ?? StockLineSortFieldInput.ItemName;
};
