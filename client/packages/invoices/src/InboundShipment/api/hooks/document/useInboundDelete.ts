import {
  useMutation,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundRowFragment } from '../../operations.generated';
import { mapInboundDeleteError } from '../../mapInboundDeleteError';
import { useInboundShipmentLineErrorContext } from '../../../context/inboundShipmentLineError';

export const useInboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const t = useTranslation();
  const { setError, unsetAll } = useInboundShipmentLineErrorContext();

  return useMutation({
    mutationFn: async (invoices: InboundRowFragment[]) => {
      unsetAll();
      const isExternal = invoices.some(inv => !!inv.purchaseOrder);
      const nodes = await api.delete(invoices, isExternal);

      const deletedIds: string[] = [];
      nodes.forEach(node => {
        const errMessage = mapInboundDeleteError(node, t, setError);
        if (errMessage) throw new Error(errMessage);
        if (node.response.__typename === 'DeleteResponse')
          deletedIds.push(node.response.id);
      });
      return deletedIds;
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base(),
      });
    },
  });
};
