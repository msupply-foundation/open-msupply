import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useOutboundApi } from './utils/useOutboundApi';
import { DraftStockOutLineFragment } from '../../../StockOut';

export const useSaveOutboundLines = (outboundId: string) => {
  const { keys, sdk, storeId } = useOutboundApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      lines,
      placeholderQuantity,
    }: {
      itemId: string;
      lines: DraftStockOutLineFragment[];
      placeholderQuantity: number | null;
    }) => {
      return await sdk.saveOutboundShipmentItemLines({
        storeId,
        input: {
          invoiceId: outboundId,
          itemId,
          lines: lines.map(line => ({
            id: line.id,
            numberOfPacks: line.numberOfPacks,
            stockLineId: line.stockLineId,
            campaignId: line.campaign?.id,
            programId: line.program?.id,
            vvmStatusId: 'vvmStatus' in line ? line.vvmStatus?.id : null,
            // Persist received as-is (null until the destination reports it), so
            // it isn't faked as the issued quantity before receipt.
            receivedNumberOfPacks: line.receivedNumberOfPacks,
            // Carry the discrepancy reason on the same save path so it isn't
            // cleared by this batch update.
            reasonOptionId: line.reasonOption?.id ?? null,
          })),
          placeholderQuantity,
        },
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.detail(outboundId)
      });
    }
  });
};
