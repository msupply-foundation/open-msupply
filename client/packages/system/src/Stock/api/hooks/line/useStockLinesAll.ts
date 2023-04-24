import { SortBy, useMutation } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';
import { StockLineRowFragment } from '../../operations.generated';

export const useStockLinesAll = (sortBy: SortBy<StockLineRowFragment>) => {
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
