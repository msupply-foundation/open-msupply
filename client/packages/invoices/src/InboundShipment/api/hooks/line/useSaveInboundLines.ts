import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useInboundNumber } from '../document/useInbound';
import { useInboundApi } from '../utils/useInboundApi';

export const useSaveInboundLines = () => {
  const queryClient = useQueryClient();
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  return useMutation(api.updateLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(invoiceNumber)),
  });
};
