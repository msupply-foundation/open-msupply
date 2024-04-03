import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useOutboundReturnDelete = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();

  return useMutation(api.deleteOutbound, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
