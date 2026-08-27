import { useOutboundApi } from './../utils/useOutboundApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';

export const useOutboundUpdate = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation({
    mutationFn: api.update,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
