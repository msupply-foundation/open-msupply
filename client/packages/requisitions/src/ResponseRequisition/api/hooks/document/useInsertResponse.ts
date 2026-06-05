import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useInsertResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation({
    mutationFn: api.insert,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
