import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateInboundReturn = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  return useMutation(api.updateInboundReturn, {
    onSuccess: () => {
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
