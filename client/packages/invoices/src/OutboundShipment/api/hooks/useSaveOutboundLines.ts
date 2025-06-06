import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useOutboundApi } from './utils/useOutboundApi';
import { DraftStockOutLineFragment } from '../../../StockOut';

export const useSaveOutboundLines = (outboundId: string) => {
  const { keys, sdk, storeId } = useOutboundApi();
  const queryClient = useQueryClient();

  return useMutation(
    async ({
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
          })),
          placeholderQuantity,
        },
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(keys.detail(outboundId));
      },
    }
  );
};
