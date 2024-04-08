import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInsertInbound = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  return useMutation(api.insert, {
    onSuccess: () => {
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
