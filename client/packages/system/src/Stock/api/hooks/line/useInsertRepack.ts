import { useMutation, useQueryClient } from 'packages/common/src';
import { useStockApi } from '../utils/useStockApi';

export const useInsertRepack = () => {
  const queryClient = useQueryClient();
  const api = useStockApi();

  return useMutation(api.insertRepack, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.list());
    },
  });
};
