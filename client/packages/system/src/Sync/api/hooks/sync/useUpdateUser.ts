import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useUpdateUser = () => {
  const api = useSyncApi();
  const queryClient = useQueryClient();

  return useMutation(api.updateUser, {
    onSettled: () => queryClient.invalidateQueries(api.keys.userSync()),
  });
};
