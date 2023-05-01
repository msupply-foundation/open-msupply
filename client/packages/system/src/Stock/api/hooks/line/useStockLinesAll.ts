import { SortBy, StockLineNode, useMutation } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useStockLinesAll = (sortBy: SortBy<StockLineNode>) => {
  const api = useStockApi();
  const result = useMutation(api.keys.sortedList(sortBy), () =>
    api.get.listAll({
      sortBy,
    })
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};
