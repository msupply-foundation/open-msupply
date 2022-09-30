import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useUpdateSyncSettings = () => {
  const queryClient = useQueryClient();
  const api = useHostApi();
  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.updateSyncSettings());
    },
  });
};
