import { useQuery } from '@tanstack/react-query';
import { useItemGraphQL } from '../useItemApi';

// Item variant inputs (e.g. in Inbound Shipment) should not be available if no item variants are configured
export const useIsItemVariantsEnabled = () => {
  const { api, storeId } = useItemGraphQL();
  const { data } = useQuery({
    queryKey: ['itemVariantsConfigured', storeId],
    queryFn: async () => {
      const result = await api.itemVariantsConfigured({
        storeId,
      });

      return result.itemVariantsConfigured;
    },
    // Only call on page load
    refetchOnMount: false,
  });

  // default to true while loading to avoid flicker
  return !!(data ?? true);
};
