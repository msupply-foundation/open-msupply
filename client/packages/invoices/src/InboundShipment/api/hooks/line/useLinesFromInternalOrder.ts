import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundNumber } from '../document/useInbound';

export const useLinesFromInternalOrder = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const invoiceNumber = useInboundNumber();

  return useMutation(api.insertLinesFromInternalOrder, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(invoiceNumber)),
  });
};
