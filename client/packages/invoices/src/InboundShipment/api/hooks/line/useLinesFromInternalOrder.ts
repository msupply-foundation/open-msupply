import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { INBOUND, INBOUND_LINE } from '../document/keys';

export const useLinesFromInternalOrder = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const { invoiceId = '' } = useParams();
  return useMutation({
    mutationFn: (lines: { invoiceId: string; requisitionLineId: string }[]) => {
      return api.insertLinesFromInternalOrder(lines, false);
    },

    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [INBOUND, INBOUND_LINE, invoiceId]
      })
  });
};
