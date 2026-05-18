import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useDeleteRequests = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation({
    mutationFn: api.deleteRequests,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
