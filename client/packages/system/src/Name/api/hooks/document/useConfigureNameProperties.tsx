import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useConfigureNameProperties = () => {
  const api = useNameApi();
  const queryClient = useQueryClient();

  return useMutation(api.configureNameProperties, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
