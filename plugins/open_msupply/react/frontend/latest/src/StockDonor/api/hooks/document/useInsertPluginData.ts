import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { usePluginApi } from '../utils/usePluginApi';

export const useInsertPluginData = () => {
  const api = usePluginApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.insert,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: api.keys.base() }),
  });
};
