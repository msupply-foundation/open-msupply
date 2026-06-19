import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '..';
import { ITEM_VARIANTS } from '../../keys';

export function useItemVariants(itemId: string) {
  const { api, storeId } = useItemGraphQL();

  return useQuery({
    queryKey: [ITEM_VARIANTS, itemId],
    queryFn: async () => {
      const result = await api.itemVariants({
        itemId,
        storeId,
      });

      // TanStack Query forbids a queryFn resolving to `undefined`, so coalesce
      // to null when no item matches (e.g. empty/inactive item id).
      return result.items.nodes?.[0] ?? null;
    },
    // Skip the query when there's no item selected (e.g. the InboundLineEdit
    // "Add item" create flow before an item is chosen).
    enabled: !!itemId,
  });
}
