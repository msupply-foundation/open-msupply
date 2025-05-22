import { useMutation } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { DraftStockOutLineFragment } from 'packages/invoices/src/OutboundShipment/api/operations.generated';

export const useSaveOutboundLines = (outboundId: string) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();
  // const queryClient = useQueryClient();

  return useMutation(
    async ({
      itemId,
      lines,
      prescribedQuantity,
      note,
    }: {
      itemId: string;
      lines: DraftStockOutLineFragment[];
      prescribedQuantity: number | null;
      note: string | null;
    }) => {
      return await prescriptionApi.savePrescriptionItemLines({
        storeId,
        input: {
          invoiceId: outboundId,
          itemId,
          lines: lines.map(line => ({
            id: line.id,
            numberOfPacks: line.numberOfPacks,
            stockLineId: line.stockLineId,
          })),
          prescribedQuantity,
          note,
        },
      });
    },
    {
      onSuccess: () => {
        // TODO: Invalidate the query for the draft lines
        // queryClient.invalidateQueries(keys.detail(outboundId));
      },
    }
  );
};
