import { useStockApi } from './../utils/useStockApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';

export const useStockLineUpdate = () => {
  const queryClient = useQueryClient();
  const api = useStockApi();
  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
