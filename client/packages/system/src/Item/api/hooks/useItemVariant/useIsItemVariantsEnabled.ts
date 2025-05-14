import { useQuery } from 'react-query';
import { useItemGraphQL } from '../useItemApi';

// Item variant inputs (e.g. in Inbound Shipment) should not be available if no item variants are configured
export const useIsItemVariantsEnabled = (itemId?: string) => {
  const { api, storeId } = useItemGraphQL();
  const { data } = useQuery({
    queryKey: ['item-variants-enabled', storeId, itemId],
    queryFn: async () => {
      const result = await api.itemVariantsConfigured({
        storeId,
      });

      return result.itemVariantsConfigured;
    },
    // Only call on page load
    refetchOnMount: false,
  });

  return !!data;
};
