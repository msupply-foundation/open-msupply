import { StockLineFilterInput, useQuery } from '@openmsupply-client/common';
import { useStockGraphQL } from '../useStockGraphQL';
import { LIST, STOCK } from './keys';

export const useStockListCount = (filterBy: StockLineFilterInput) => {
  const { stockApi, storeId } = useStockGraphQL();
  const queryKey = [STOCK, LIST, storeId, filterBy];
  const queryFn = async (): Promise<{
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      hasPacksInStore: true,
      masterList: {
        ...filterBy?.masterList,
      },
    };

    const query = await stockApi.stockLinesCount({
      storeId,
      filter,
    });
    const { totalCount } = query?.stockLines;
    return { totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
