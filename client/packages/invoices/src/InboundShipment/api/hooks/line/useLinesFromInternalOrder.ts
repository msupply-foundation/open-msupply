import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundId } from '../document/useInbound';

export const useLinesFromInternalOrder = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const invoiceId = useInboundId();

  return useMutation(api.insertLinesFromInternalOrder, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(invoiceId)),
  });
};
