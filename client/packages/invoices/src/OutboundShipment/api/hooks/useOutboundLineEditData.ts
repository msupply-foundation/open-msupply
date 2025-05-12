import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './utils/useOutboundApi';
import { DraftOutboundLineFragment } from '../operations.generated';
import { DraftItem } from 'packages/invoices/src';

export type OutboundLineEditData = {
  item: DraftItem;
  draftLines: DraftOutboundLineFragment[];
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

      return {
        item,
        draftLines: result.draftOutboundShipmentLines,
      };
    },
    enabled: !!itemId,
  });
};
