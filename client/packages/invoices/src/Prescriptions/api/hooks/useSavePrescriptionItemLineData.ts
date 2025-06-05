import { useMutation } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';
import { DraftStockOutLineFragment } from '../../../StockOut';

export const useSavePrescriptionItemLineData = (invoiceId: string) => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  return useMutation(
    async ({
      itemId,
      lines,
      prescribedUnits,
      note,
    }: {
      itemId: string;
      lines: DraftStockOutLineFragment[];
      prescribedUnits: number | null;
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
          prescribedQuantity:
            (prescribedUnits ?? 0) > 0 ? prescribedUnits : null,
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
