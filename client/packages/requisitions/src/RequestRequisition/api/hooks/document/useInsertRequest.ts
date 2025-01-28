import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertRequest = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.insert, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
