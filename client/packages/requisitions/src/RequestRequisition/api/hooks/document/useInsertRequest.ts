import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertRequest = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation({
    mutationFn: api.insert,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
