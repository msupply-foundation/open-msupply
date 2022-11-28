import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useOutboundApi } from '../utils/useOutboundApi';

export const useOutboundUpdateName = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();

  return useMutation(api.updateName, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
