import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useManualSync = () => {
  const api = useHostApi();
  const queryClient = useQueryClient();

  return useMutation(api.manualSync, {
    onSettled: () => queryClient.invalidateQueries(api.keys.syncInfo()),
  });
};
