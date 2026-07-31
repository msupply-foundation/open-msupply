import { useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM_PROPERTIES_V2 } from '../keys';

/**
 * Fetch the `item`-table customFields definitions once. The value blob alone
 * isn't renderable — we need the definitions for the human label (`name`),
 * the `valueType` (to pick the right read control) and to resolve OPTION values.
 */
export const useItemCustomFields = () => {
  const { api } = useItemGraphQL();

  return useQuery({
    queryKey: [ITEM_PROPERTIES_V2],
    queryFn: async () => {
      const result = await api.itemCustomFields();
      if (result?.customFields?.__typename === 'CustomFieldConnector') {
        return result.customFields.nodes;
      }
      throw new Error('Unable to fetch item properties');
    },
  });
};
