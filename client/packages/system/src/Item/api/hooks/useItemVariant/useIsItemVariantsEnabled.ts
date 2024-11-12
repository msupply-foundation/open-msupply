import { useQuery } from 'react-query';
import { useItemGraphQL } from '../useItemApi';
import { ITEM_VARIANTS } from '../../keys';

// Item variant inputs (i.e. in Inbound Shipment) should not be available if no item variants are configured
export const useIsItemVariantsEnabled = () => {
  const { api, storeId } = useItemGraphQL();
  const { data } = useQuery({
    queryKey: [ITEM_VARIANTS],
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
