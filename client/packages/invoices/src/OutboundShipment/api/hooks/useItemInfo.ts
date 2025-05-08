import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './utils/useOutboundApi';

export const useItemInfo = (itemId?: string) => {
  const { keys, sdk, storeId } = useOutboundApi();
  // return useQuery(api.keys.detail(id), () => api.get.byId(id));

  return useQuery({
    queryKey: [keys.base(), itemId],
    queryFn: async () => {
      if (!itemId) {
        return null;
      }
      const result = await sdk.getItemInfo({ itemId, storeId });

      return result.items.nodes[0];
    },
    enabled: !!itemId,
  });
};
