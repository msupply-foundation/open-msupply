import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateOutboundReturnOtherParty = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();

  return useMutation(api.updateOtherParty, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
