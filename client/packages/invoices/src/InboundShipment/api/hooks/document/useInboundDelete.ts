import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundRowFragment } from '../../operations.generated';

export const useInboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();

  return useMutation({
    mutationFn: (invoices: InboundRowFragment[]) => {
      const isExternal = invoices.some(inv => !!inv.purchaseOrder);
      return api.delete(invoices, isExternal);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
