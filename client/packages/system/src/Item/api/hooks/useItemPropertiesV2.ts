import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM_PROPERTIES_V2 } from '../keys';

/**
 * Fetch the `item`-table propertiesV2 definitions once. The value blob alone
 * isn't renderable — we need the definitions for the human label (`name`),
 * the `valueType` (to pick the right read control) and to resolve OPTION values.
 */
export const useItemPropertiesV2 = () => {
  const { api } = useItemGraphQL();

  return useQuery({
    queryKey: [ITEM_PROPERTIES_V2],
    queryFn: async () => {
      const result = await api.itemPropertiesV2();
      if (result?.propertiesV2?.__typename === 'PropertyV2Connector') {
        return result.propertiesV2.nodes;
      }
      throw new Error('Unable to fetch item properties');
    },
  });
};
