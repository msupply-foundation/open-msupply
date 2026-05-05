import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useOutboundApi } from '../utils/useOutboundApi';

export const useOutboundUpdateName = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();

  return useMutation({
    mutationFn: api.updateName,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
