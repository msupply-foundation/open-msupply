import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { useItemApi } from './useItemApi';

// Master list price per unit
export const useItemPrice = (itemId?: string) => {
  const { api, storeId } = useItemGraphQL();
  const { keys } = useItemApi();

  return useQuery({
    queryKey: [...keys.detail(itemId ?? ''), 'price'],
    queryFn: async () => {
      const result = await api.itemPrice({
        storeId,
        itemId: itemId ?? '',
      });
      return result.itemPrice;
    },
    enabled: !!itemId,
  });
};
