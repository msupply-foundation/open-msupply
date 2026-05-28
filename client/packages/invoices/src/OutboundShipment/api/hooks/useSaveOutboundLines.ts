import {
  useMutation,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useOutboundApi } from './utils/useOutboundApi';
import { DraftStockOutLineFragment } from '../../../StockOut';

export const useSaveOutboundLines = (outboundId: string) => {
  const { keys, sdk, storeId } = useOutboundApi();
  const queryClient = useQueryClient();
  const t = useTranslation();

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
      const result = await sdk.saveOutboundShipmentItemLines({
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
            receivedNumberOfPacks: line.receivedNumberOfPacks ?? null,
            reasonOptionId: line.reasonOption?.id ?? null,
          })),
          placeholderQuantity,
        },
      });

      const response = result.saveOutboundShipmentItemLines;
      if (response.__typename === 'SaveOutboundShipmentLinesError') {
        switch (response.error.__typename) {
          case 'ShipmentVarianceReasonNotProvided':
            throw new Error(t('error.shipment-variance-reason-required'));
        }
      }
      return result;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keys.detail(outboundId)
      });
    }
  });
};
