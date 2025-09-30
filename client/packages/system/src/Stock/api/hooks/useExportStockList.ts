import {
  FilterBy,
  StockLineSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../operations.generated';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

export const useExportStockList = (filterBy: FilterBy | null) => {
  const { stockApi, storeId } = useStockGraphQL();

  const queryKey = [STOCK, storeId, LIST];
  const queryFn = async (): Promise<{
    nodes: StockLineRowFragment[];
    totalCount: number;
  }> => {
    const result = await stockApi.stockLines({
      key: StockLineSortFieldInput.ItemName,
      desc: false,
      storeId,
      filter: { ...filterBy, hasPacksInStore: true },
    });
    return result?.stockLines;
  };

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
    enabled: false,
  });
  return { data, fetchStock: refetch, isLoading, isError };
};
