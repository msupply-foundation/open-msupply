import {
  InvoiceLineNodeType,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundLineFragment } from '../../operations.generated';

export const useUpdateInboundServiceTax = (isExternal: boolean) => {
  const queryClient = useQueryClient();
  const api = useInboundApi();

  return useMutation(
    (input: {
      lines: InboundLineFragment[];
      taxPercentage: number;
      type: InvoiceLineNodeType.StockIn | InvoiceLineNodeType.Service;
    }) => {
      return api.updateServiceTax({ ...input, isExternal });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(api.keys.base());
      },
    }
  );
};
