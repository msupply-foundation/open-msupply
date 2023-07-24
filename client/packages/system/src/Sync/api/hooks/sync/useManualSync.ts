import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useManualSync = () => {
  const api = useSyncApi();
  const queryClient = useQueryClient();

  return useMutation(api.manualSync, {
    onSettled: () => queryClient.invalidateQueries(api.keys.syncInfo()),
  });
};
