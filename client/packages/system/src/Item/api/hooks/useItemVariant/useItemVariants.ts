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

      return result.items.nodes?.[0]?.variants;
    },
  });
}
