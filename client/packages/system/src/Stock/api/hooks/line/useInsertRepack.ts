import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useInsertRepack = (stockLineId: string) => {
  const queryClient = useQueryClient();
  const api = useStockApi();

  return useMutation(api.insertRepack, {
    onSuccess: () => {
      // Stock list needs to be re-fetched to load new repacked stock line
      queryClient.invalidateQueries(api.keys.list());
      // Repack list also needs to be re-fetched on insert to show new repack line
      queryClient.invalidateQueries(
        api.keys.listRepackByStockLine(stockLineId)
      );
    },
  });
};
