import {
  useQueryClient,
  useMutation,
  useTranslation,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useInboundNumber } from '../document/useInbound';
import { useInboundApi } from '../utils/useInboundApi';
import { DraftInboundLine } from 'packages/invoices/src/types';

export const useSaveInboundLines = () => {
  const queryClient = useQueryClient();
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  const t = useTranslation('replenishment');

  return useMutation(
    async (lines: DraftInboundLine[]): Promise<{ errorMessage?: string }> => {
      const result = await api.updateLines(lines);

      const allResults = [
        ...(result.batchInboundShipment.insertInboundShipmentLines || []),
        ...(result.batchInboundShipment.updateInboundShipmentLines || []),
        ...(result.batchInboundShipment.deleteInboundShipmentLines || []),
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
            return { errorMessage: t('error.batch-is-reserved') };

          case 'CannotEditInvoice':
            return { errorMessage: t('error.inbound-shipment-not-editable') };

          case 'NotAnInboundShipment':
          case 'RecordNotFound':
          case 'ForeignKeyError':
            return { errorMessage: t('error.something-wrong') };

          default:
            noOtherVariants(response.error);
        }
      }
      return { errorMessage: undefined };
    },
    {
      onSettled: () =>
        queryClient.invalidateQueries(api.keys.detail(invoiceNumber)),
    }
  );
};
