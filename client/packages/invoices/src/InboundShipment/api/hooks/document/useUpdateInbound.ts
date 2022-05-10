import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useUpdateInbound = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
