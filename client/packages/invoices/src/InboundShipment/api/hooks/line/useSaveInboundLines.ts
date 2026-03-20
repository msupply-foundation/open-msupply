import {
  useQueryClient,
  useMutation,
  useTranslation,
  noOtherVariants,
  useParams,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { DraftInboundLine } from '../../../../types';
import { INBOUND, INBOUND_LINE } from '../document/keys';

export const useSaveInboundLines = (isExternal: boolean) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const { invoiceId = '' } = useParams();
  const api = useInboundApi();

  return useMutation(
    async (lines: DraftInboundLine[]): Promise<{ errorMessage?: string }> => {
      const result = await api.updateLines(lines, isExternal);

      const allResults = [
        ...(result.batchInboundShipment.insertInboundShipmentLines || []),
        ...(result.batchInboundShipment.updateInboundShipmentLines || []),
        ...(result.batchInboundShipment.insertInboundShipmentServiceLines ||
          []),
        ...(result.batchInboundShipment.updateInboundShipmentServiceLines ||
          []),
        ...(result.batchInboundShipment.deleteInboundShipmentServiceLines ||
          []),
      ];

      for (const { response } of allResults) {
        // Success responses
        if (response.__typename === 'InvoiceLineNode') continue;
        if (response.__typename === 'DeleteResponse') continue;

        switch (response.error.__typename) {
          case 'BatchIsReserved':
            throw Error(t('error.batch-is-reserved'));

          case 'CannotEditInvoice':
            throw Error(t('error.inbound-shipment-not-editable'));

          case 'NotAnInboundShipment':
          case 'RecordNotFound':
          case 'ForeignKeyError':
            throw Error(t('error.something-wrong'));

          default:
            noOtherVariants(response.error);
        }
      }
      return { errorMessage: undefined };
    },

    {
      onSettled: () =>
        queryClient.invalidateQueries([INBOUND, INBOUND_LINE, invoiceId]),
    }
  );
};
