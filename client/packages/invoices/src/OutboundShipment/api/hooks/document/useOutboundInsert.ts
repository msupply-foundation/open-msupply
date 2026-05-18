import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutboundInsert = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation({
    mutationFn: api.insert.outbound,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
