import { useQuery } from 'react-query';
import { useItemGraphQL } from '../useItemApi';
import { ITEM_VARIANTS } from '../../keys';

export const useItemVariantsConfigured = () => {
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
