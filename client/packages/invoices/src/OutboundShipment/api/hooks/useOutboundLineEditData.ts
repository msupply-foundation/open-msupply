import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './utils/useOutboundApi';
import { DraftStockOutLineFragment } from '../operations.generated';
import { DraftItem } from 'packages/invoices/src';

export type OutboundLineEditData = {
  item: DraftItem;
  draftLines: DraftStockOutLineFragment[];
  placeholderQuantity: number | null;
};

export const useOutboundLineEditData = (invoiceId: string, itemId?: string) => {
  const { keys, sdk, storeId } = useOutboundApi();

  return useQuery({
    queryKey: [...keys.detail(invoiceId), 'item', itemId],
    queryFn: async (): Promise<OutboundLineEditData | undefined> => {
      if (!itemId) return;

      const result = await sdk.getOutboundEditLines({
        itemId,
        storeId,
        invoiceId,
      });

      const item = result.items.nodes[0];

      if (!item) return;

      const { draftLines, placeholderQuantity = null } =
        result.draftStockOutLines;

      return {
        item,
        draftLines,
        placeholderQuantity,
      };
    },
    // We'll call this manually
    enabled: false,
  });
};
