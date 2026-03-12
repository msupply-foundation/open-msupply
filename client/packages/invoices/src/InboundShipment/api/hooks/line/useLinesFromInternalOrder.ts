import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundFragment } from '../../operations.generated';
import { INBOUND, INBOUND_LINE } from '../document/keys';

export const useLinesFromInternalOrder = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const { invoiceId = '' } = useParams();
  return useMutation(
    (lines: { invoiceId: string; requisitionLineId: string }[]) => {
      const invoice = queryClient.getQueryData<InboundFragment>([
        INBOUND,
        INBOUND_LINE,
        invoiceId,
      ]);
      const isExternal = !!invoice?.purchaseOrder;
      return api.insertLinesFromInternalOrder(lines, isExternal);
    },
    {
      onSettled: () =>
        queryClient.invalidateQueries([INBOUND, INBOUND_LINE, invoiceId]),
    }
  );
};
