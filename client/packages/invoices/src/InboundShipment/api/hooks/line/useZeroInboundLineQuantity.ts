import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useZeroInboundLineQuantity = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();

  return useMutation(api.zeroLinesQuantity, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
