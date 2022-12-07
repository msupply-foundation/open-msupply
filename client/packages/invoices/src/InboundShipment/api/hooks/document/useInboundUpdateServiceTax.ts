import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useUpdateInboundServiceTax = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  return useMutation(api.updateServiceTax, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
