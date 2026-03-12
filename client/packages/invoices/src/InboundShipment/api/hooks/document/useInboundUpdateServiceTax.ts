import {
  InvoiceLineNodeType,
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundFragment, InboundLineFragment } from '../../operations.generated';
import { INBOUND, INBOUND_LINE } from './keys';

export const useUpdateInboundServiceTax = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const { invoiceId = '' } = useParams();

  return useMutation(
    (input: {
      lines: InboundLineFragment[];
      taxPercentage: number;
      type: InvoiceLineNodeType.StockIn | InvoiceLineNodeType.Service;
    }) => {
      const invoice = queryClient.getQueryData<InboundFragment>([
        INBOUND,
        INBOUND_LINE,
        invoiceId,
      ]);
      const isExternal = !!invoice?.purchaseOrder;
      return api.updateServiceTax({ ...input, isExternal });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(api.keys.base());
      },
    }
  );
};
