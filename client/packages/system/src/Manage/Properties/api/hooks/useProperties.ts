import { useQuery } from '@openmsupply-client/common';
import { usePropertiesGraphQL } from '../usePropertiesGraphQL';
import { PropertyConfigKeys } from './keys';

/**
 * Fetches the full property catalogue with every property's per-scope display
 * modes (incl. hidden, and incl. scopes the property isn't associated with via
 * their *absence*). Central-server config — the list is small, so it's fetched
 * in one go and filtered/sorted client-side.
 */
export const useProperties = () => {
  const { api } = usePropertiesGraphQL();

  return useQuery({
    queryKey: PropertyConfigKeys.list(),
    queryFn: async () => {
      const result = await api.propertyConfigList();
      if (result.propertiesV2.__typename === 'PropertyV2Connector') {
        return result.propertiesV2.nodes;
      }
      throw new Error('Unable to fetch properties');
    },
  });
};

/** A single property by id, selected from the (cached) full catalogue. */
export const useProperty = (propertyId?: string) => {
  const { data, isLoading, isError } = useProperties();
  return {
    property: data?.find(node => node.id === propertyId),
    isLoading,
    isError,
  };
};
