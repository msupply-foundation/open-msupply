import { useQuery } from '@openmsupply-client/common';
import { DraftItem, DraftStockOutLineFragment } from '..';
import { useStockOutGraphQL } from './useStockOutGraphQL';

export type OutboundLineEditData = {
  item: DraftItem;
  draftLines: DraftStockOutLineFragment[];
  placeholderUnits: number | null;
  prescribedUnits?: number | null;
  note?: string | null;
};

export const useOutboundLineEditData = (invoiceId: string, itemId?: string) => {
  const { storeId, api } = useStockOutGraphQL();

  return useQuery({
    queryKey: [invoiceId, 'item', itemId],
    queryFn: async (): Promise<OutboundLineEditData | undefined> => {
      if (!itemId) return;

      const result = await api.getOutboundEditLines({
        itemId,
        storeId,
        invoiceId,
      });

      const item = result.items.nodes[0];

      if (!item) return;

      const {
        draftLines,
        placeholderQuantity = null,
        prescribedQuantity,
        note,
      } = result.draftStockOutLines;

      return {
        item,
        draftLines,
        placeholderUnits: placeholderQuantity,
        prescribedUnits: prescribedQuantity,
        note,
      };
    },
    // We'll call this manually
    enabled: false,
  });
};
