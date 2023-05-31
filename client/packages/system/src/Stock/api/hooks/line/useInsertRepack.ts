import { useMutation, useQueryClient } from 'packages/common/src';
import { useStockApi } from '../utils/useStockApi';

export const useInsertRepack = (stockLineId: string) => {
  const queryClient = useQueryClient();
  const api = useStockApi();

  return useMutation(api.insertRepack, {
    onSuccess: () => {
      // Stock list needs to be re-fetched to load new repacked stock line
      queryClient.invalidateQueries(api.keys.list());
      queryClient.invalidateQueries(
        api.keys.listRepackByStockLine(stockLineId)
      );
    },
  });
};
