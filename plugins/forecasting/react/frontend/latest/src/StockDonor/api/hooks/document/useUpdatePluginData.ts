import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePluginApi } from '../utils/usePluginApi';

export const useUpdatePluginData = () => {
  const api = usePluginApi();
  const queryClient = useQueryClient();

  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
