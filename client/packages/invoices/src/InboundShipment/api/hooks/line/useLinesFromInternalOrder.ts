import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundId } from '../document/useInbound';
import { INBOUND, INBOUND_LINE } from '../document/keys';

export const useLinesFromInternalOrder = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const invoiceId = useInboundId();

  return useMutation(api.insertLinesFromInternalOrder, {
    onSettled: () =>
      queryClient.invalidateQueries([INBOUND, INBOUND_LINE, invoiceId]),
  });
};
