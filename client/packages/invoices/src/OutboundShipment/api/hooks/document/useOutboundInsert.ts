import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutboundInsert = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.insert.outbound, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
