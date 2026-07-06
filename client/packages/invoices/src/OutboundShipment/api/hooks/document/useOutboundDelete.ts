import { useOutboundApi } from './../utils/useOutboundApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';

export const useOutboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();

  return useMutation({
    mutationFn: api.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
