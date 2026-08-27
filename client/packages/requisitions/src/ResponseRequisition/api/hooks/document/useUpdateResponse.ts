import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useUpdateResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation({
    mutationFn: api.update,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
