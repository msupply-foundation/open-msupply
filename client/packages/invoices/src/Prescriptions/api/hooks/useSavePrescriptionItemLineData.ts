import { useMutation } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { DraftStockOutLineFragment } from 'packages/invoices/src/OutboundShipment/api/operations.generated';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';

export const useSavePrescriptionItemLineData = (invoiceId: string) => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

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
          invoiceId,
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
        queryClient.invalidateQueries([
          PRESCRIPTION,
          PRESCRIPTION_LINE,
          invoiceId,
        ]);
      },
    }
  );
};
