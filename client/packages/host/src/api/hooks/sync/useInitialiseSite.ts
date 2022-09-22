import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useInitialiseSite = () => {
  const queryClient = useQueryClient();
  const api = useHostApi();
  return useMutation(api.initialise, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.initialiseSite());
    },
  });
};
