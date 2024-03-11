import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateOutboundReturn = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  return useMutation(api.updateOutboundReturn, {
    onSuccess: () => {
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
