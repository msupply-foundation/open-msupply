import { useMutation, useQueryClient } from 'packages/common/src';
import { useStockApi } from '../utils/useStockApi';

export const useInsertRepack = (stockLineId: string) => {
  const queryClient = useQueryClient();
  const api = useStockApi();

  return useMutation(api.insertRepack, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.list());
      queryClient.invalidateQueries(
        api.keys.listRepackByStockLine(stockLineId)
      );
    },
  });
};
